import { pool } from "@/db/pool";
import { findHoldForUpdate } from "@/repositories/hold.repository";
import { findOrderByHoldId, calculateHoldTotal, insertOrder, markHoldCompleted, findOrdersByFanId, hasUsedWelcome20 } from "@/repositories/order.repository";
import type { CheckoutInput, CheckoutResult, CheckoutServiceResult, OrderRow, MyTicketResult, PromoCode } from "@/types/order.types";

export async function checkout(
  holdId: string,
  data: CheckoutInput
): Promise<CheckoutServiceResult> {
  if (
    !data ||
    typeof data.fan_id !== "string" ||
    !isValidUUID(holdId) ||
    !isValidUUID(data.fan_id)
  ) {
    throw new Error("Invalid checkout information");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const hold = await findHoldForUpdate(client, holdId);

    if (!hold) {
      throw new Error("Hold not found");
    }

    if (hold.fan_id !== data.fan_id) {
      throw new Error("You do not own this hold");
    }

    const existingOrder = await findOrderByHoldId(client, holdId);

    if (existingOrder) {
      await client.query("COMMIT");

      return {
        order: toCheckoutResult(existingOrder),
        created: false,
      };
    }

    if (hold.status !== "ACTIVE") {
      throw new Error("Hold is not active");
    }

    if (new Date(hold.expires_at) <= new Date()) {
      throw new Error("Hold has expired");
    }

    const subtotalAgorot = await calculateHoldTotal(client, holdId);

    if (subtotalAgorot <= 0) {
      throw new Error("Hold has no valid seats");
    }

    const rawPromoCode = data.promo_code;

    if (
      rawPromoCode !== undefined &&
      rawPromoCode !== null &&
      typeof rawPromoCode !== "string"
    ) {
      throw new Error("Invalid promo code");
    }

    const promoCodeInput = rawPromoCode?.trim().toUpperCase() ?? "";

    let promoCode: PromoCode | null = null;
    let discountAgorot = 0;

    if (promoCodeInput !== "") {
      if (promoCodeInput === "SAVE10") {
        promoCode = "SAVE10";

        discountAgorot = Math.floor(
          (subtotalAgorot * 10 + 50) / 100
        );
      } else if (promoCodeInput === "WELCOME20") {
        promoCode = "WELCOME20";

        const alreadyUsed = await hasUsedWelcome20(
          client,
          data.fan_id
        );

        if (alreadyUsed) {
          throw new Error("Promo code already used");
        }

        discountAgorot = Math.min(subtotalAgorot, 2000);
      } else {
        throw new Error("Invalid promo code");
      }
    }

    const order = await insertOrder(
      client,
      holdId,
      data.fan_id,
      subtotalAgorot,
      promoCode,
      discountAgorot
    );

    await markHoldCompleted(client, holdId);

    await client.query("COMMIT");

    return {
      order: toCheckoutResult(order),
      created: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "23505" &&
      "constraint" in error &&
      error.constraint === "unique_welcome20_per_fan"
    ) {
      throw new Error("Promo code already used");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function getFanOrders(
  fanId: string
): Promise<MyTicketResult[]> {
  if (typeof fanId !== "string" || !isValidUUID(fanId)) {
    throw new Error("Invalid fan ID");
  }

  const client = await pool.connect();

  try {
    const orders = await findOrdersByFanId(client, fanId);

    return orders.map((order): MyTicketResult => ({
      order_id: order.order_id,
      event_id: order.event_id,
      event_name: order.event_name,
      venue: order.venue,
      starts_at: order.starts_at,
      subtotal_agorot: order.subtotal_agorot,
      promo_code: order.promo_code,
      discount_agorot: order.discount_agorot,
      total_agorot: order.total_agorot,
      created_at: order.created_at,
      seat_ids: order.seat_ids,
    }));
  } finally {
    client.release();
  }
}

function toCheckoutResult(order: OrderRow): CheckoutResult {
  return {
    order_id: order.id,
    hold_id: order.hold_id,
    fan_id: order.fan_id,
    subtotal_agorot: order.subtotal_agorot,
    promo_code: order.promo_code,
    discount_agorot: order.discount_agorot,
    total_agorot: order.total_agorot,
    created_at: order.created_at,
  };
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
