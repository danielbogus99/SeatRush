import { useState } from "react";
import type { Fan } from "@/types/fan.types";
import type { Event } from "@/types/event.types";
import type { CreateHoldResult } from "@/types/hold.types";
import type { CheckoutResult } from "@/types/order.types";
import type { BestAvailableInput } from "@/types/bestAvailable.types";

import { createHold, releaseHold } from "@/api/hold.api";
import { createBestAvailableHold } from "@/api/bestAvailable.api";
import { checkout } from "@/api/order.api";
import { errorMessage } from "@/utils/formatters";

interface UseBookingOptions {
  fan: Fan | null;
  selectedEvent: Event | null;
  selectedSeatIds: string[];
  activeHold: CreateHoldResult | null;
  currentBooking: CheckoutResult | null;
  promoCode: string;

  isOperationInProgress: () => boolean;
  setOperationInProgress: (value: boolean) => void;

  saveHold: (hold: CreateHoldResult) => void;
  removeHold: (eventId: string, holdId: string, fanId: string) => void;
  expireHold: (hold: CreateHoldResult, showMessage: boolean) => Promise<void>;
  refreshSeats: (eventId: string, clearSelection?: boolean) => Promise<void>;

  setSelectedSeatIds: (ids: string[]) => void;
  setCurrentBooking: (order: CheckoutResult | null) => void;
  setPromoCode: (value: string) => void;
  setError: (value: string | null) => void;
  setNotice: (value: string | null) => void;
}

export function useBooking({
  fan,
  selectedEvent,
  selectedSeatIds,
  activeHold,
  currentBooking,
  promoCode,
  isOperationInProgress,
  setOperationInProgress,
  saveHold,
  removeHold,
  expireHold,
  refreshSeats,
  setSelectedSeatIds,
  setCurrentBooking,
  setPromoCode,
  setError,
  setNotice,
}: UseBookingOptions) {

  const [isHolding, setIsHolding] = useState(false);
  const [isFindingBestSeats, setIsFindingBestSeats] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const isBookingBusy =
    isHolding ||
    isFindingBestSeats ||
    isReleasing ||
    isCheckingOut;


  async function handleHoldSeats() {
    if (
      !fan ||
      !selectedEvent ||
      selectedSeatIds.length === 0 ||
      activeHold ||
      currentBooking ||
      isOperationInProgress()
    ) {
      return;
    }

    setOperationInProgress(true);
    setIsHolding(true);
    setError(null);
    setNotice(null);

    const eventId = selectedEvent.id;

    try {
      const hold = await createHold(eventId, {
        fan_id: fan.id,
        seat_ids: selectedSeatIds,
      });

      saveHold(hold);
      setSelectedSeatIds(hold.seat_ids);

      try {
        await refreshSeats(eventId, false);
      } catch (err) {
        console.error("Seat refresh failed:", err);
        setNotice("Seats held, but the map could not be refreshed.");
      }
    } catch (err) {
      setError(errorMessage(err, "Failed to create hold"));

      try {
        await refreshSeats(eventId);
      } catch (refreshError) {
        console.error("Seat refresh failed:", refreshError);
      }
    } finally {
      setOperationInProgress(false);
      setIsHolding(false);
    }
  }

  async function handleBestAvailable(
    input: BestAvailableInput
  ): Promise<void> {
    if (
      !fan ||
      !selectedEvent ||
      activeHold ||
      currentBooking ||
      isOperationInProgress()
    ) {
      return;
    }

    setOperationInProgress(true);
    setIsFindingBestSeats(true);
    setError(null);
    setNotice(null);

    const eventId = selectedEvent.id;

    try {
      const hold = await createBestAvailableHold(eventId, {
        ...input,
        fan_id: fan.id,
      });

      saveHold(hold);
      setSelectedSeatIds(hold.seat_ids);

      try {
        await refreshSeats(eventId, false);
      } catch (err) {
        console.error("Seat refresh failed:", err);
        setNotice("Seats held, but the map could not be refreshed.");
      }
    } catch (err) {
      setError(errorMessage(err, "Failed to find best available seats"));

      try {
        await refreshSeats(eventId);
      } catch (refreshError) {
        console.error("Seat refresh failed:", refreshError);
      }
    } finally {
      setOperationInProgress(false);
      setIsFindingBestSeats(false);
    }
  }

  async function handleReleaseHold() {
    if (
      !fan ||
      !activeHold ||
      activeHold.fan_id !== fan.id ||
      isOperationInProgress()
    ) {
      return;
    }

    setOperationInProgress(true);
    setIsReleasing(true);
    setError(null);
    setNotice(null);

    const hold = activeHold;

    try {
      await releaseHold(hold.hold_id, {
        fan_id: hold.fan_id,
      });

      removeHold(hold.event_id, hold.hold_id, hold.fan_id);

      setSelectedSeatIds([]);
      setPromoCode("");
      setNotice("Your seats have been released successfully.");

      try {
        await refreshSeats(hold.event_id);
      } catch (err) {
        console.error("Seat refresh failed:", err);
        setError("Hold released, but failed to refresh seats.");
      }
    } catch (err) {
      setError(errorMessage(err, "Failed to release hold"));
    } finally {
      setOperationInProgress(false);
      setIsReleasing(false);
    }
  }

  async function handleCheckout() {
    if (
      !fan ||
      !activeHold ||
      activeHold.fan_id !== fan.id ||
      isOperationInProgress()
    ) {
      return;
    }

    const hold = activeHold;

    if (Date.parse(hold.expires_at) <= Date.now()) {
      await expireHold(hold, true);
      return;
    }

    setOperationInProgress(true);
    setIsCheckingOut(true);
    setError(null);
    setNotice(null);

    try {
      const normalizedPromoCode = promoCode.trim().toUpperCase();

      const order = await checkout(hold.hold_id, {
        fan_id: hold.fan_id,
        ...(normalizedPromoCode
          ? { promo_code: normalizedPromoCode }
          : {}),
      });

      removeHold(hold.event_id, hold.hold_id, hold.fan_id);

      setCurrentBooking(order);
      setSelectedSeatIds([]);
      setPromoCode("");

      try {
        await refreshSeats(hold.event_id);
      } catch (err) {
        console.error("Seat refresh failed:", err);
        setNotice("Booking confirmed, but seat refresh failed.");
      }
    } catch (err) {
      setError(errorMessage(err, "Failed to complete booking"));
    } finally {
      setOperationInProgress(false);
      setIsCheckingOut(false);
    }
  }

  return {
    isHolding,
    isFindingBestSeats,
    isReleasing,
    isCheckingOut,
    isBookingBusy,
    handleHoldSeats,
    handleBestAvailable,
    handleReleaseHold,
    handleCheckout,
  };
}
