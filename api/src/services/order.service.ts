
import { pool } from "@/db/pool";
import { findHoldForUpdate } from "@/repositories/hold.repository";
import { findOrderByHoldId, calculateHoldTotal, insertOrder, markHoldCompleted, findOrdersByFanId } from "@/repositories/order.repository";
import type { CheckoutInput, CheckoutResult, CheckoutServiceResult, OrderRow, MyTicketResult } from "@/types/order.types";

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

    const totalAgorot = await calculateHoldTotal(client, holdId);

    if (totalAgorot <= 0) {
      throw new Error("Hold has no valid seats");
    }

    const order = await insertOrder(
      client,
      holdId,
      data.fan_id,
      totalAgorot
    );

    await markHoldCompleted(client, holdId);

    await client.query("COMMIT");

    return {
      order: toCheckoutResult(order),
      created: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Get all orders belonging to a fan.
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
    total_agorot: order.total_agorot,
    created_at: order.created_at,
  };
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
