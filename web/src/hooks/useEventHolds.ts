import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateHoldResult } from "@/types/hold.types";
import type { HoldsByEvent } from "@/utils/holdStorage";
import { loadHolds, saveHolds } from "@/utils/holdStorage";

interface UseEventHoldsOptions {
  fanId: string | null;
  selectedEventId: string | null;
  onSelectedHoldExpired: (eventId: string) => void | Promise<void>;
  isOperationInProgress: () => boolean;
}

export function useEventHolds({
  fanId,
  selectedEventId,
  onSelectedHoldExpired,
  isOperationInProgress,
}: UseEventHoldsOptions) {
  

  const [holdsByEvent, setHoldsByEvent] = useState<HoldsByEvent>(
    () => loadHolds(fanId)
  );

  const [now, setNow] = useState(() => Date.now());


  const fanIdRef = useRef<string | null>(fanId);
  const holdsRef = useRef<HoldsByEvent>(holdsByEvent);
  const expiredHoldIds = useRef<Set<string>>(new Set());

  const expirationCallbackRef = useRef(onSelectedHoldExpired);
  const selectedEventIdRef = useRef(selectedEventId);
  const operationCheckRef = useRef(isOperationInProgress);

  useEffect(() => {
    expirationCallbackRef.current = onSelectedHoldExpired;
    selectedEventIdRef.current = selectedEventId;
    operationCheckRef.current = isOperationInProgress;
  }, [onSelectedHoldExpired, selectedEventId, isOperationInProgress]);

  const updateHolds = useCallback(
    (next: HoldsByEvent, ownerId: string) => {
      if (fanIdRef.current !== ownerId) return;

      holdsRef.current = next;
      setHoldsByEvent(next);
      saveHolds(ownerId, next);
    },
    []
  );


  const saveHold = useCallback(
    (hold: CreateHoldResult) => {
      if (fanIdRef.current !== hold.fan_id) return;

      updateHolds(
        {
          ...holdsRef.current,
          [hold.event_id]: hold,
        },
        hold.fan_id
      );
    },
    [updateHolds]
  );

  const removeHold = useCallback(
    (eventId: string, holdId: string, ownerId: string) => {
      if (fanIdRef.current !== ownerId) return;

      const current = holdsRef.current;

      if (current[eventId]?.hold_id !== holdId) return;

      const next = { ...current };
      delete next[eventId];

      updateHolds(next, ownerId);
    },
    [updateHolds]
  );

  const switchFanData = useCallback((nextFanId: string | null) => {
    fanIdRef.current = nextFanId;

    const nextHolds = loadHolds(nextFanId);

    holdsRef.current = nextHolds;
    setHoldsByEvent(nextHolds);

    expiredHoldIds.current.clear();
  }, []);

  const expireHold = useCallback(
    async (hold: CreateHoldResult, showMessage: boolean) => {
      if (fanIdRef.current !== hold.fan_id) return;
      if (expiredHoldIds.current.has(hold.hold_id)) return;

      expiredHoldIds.current.add(hold.hold_id);

      removeHold(
        hold.event_id,
        hold.hold_id,
        hold.fan_id
      );

      if (
        showMessage &&
        selectedEventIdRef.current === hold.event_id
      ) {
        await expirationCallbackRef.current(hold.event_id);
      }
    },
    [removeHold]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentTime = Date.now();

      setNow(currentTime);

      if (operationCheckRef.current()) return;

      for (const hold of Object.values(holdsRef.current)) {
        if (Date.parse(hold.expires_at) <= currentTime) {
          void expireHold(
            hold,
            selectedEventIdRef.current === hold.event_id
          );
        }
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expireHold]);

  const activeHoldCount = Object.values(holdsByEvent).filter(
    (hold) => Date.parse(hold.expires_at) > now
  ).length;

  const activeHold = selectedEventId
    ? holdsByEvent[selectedEventId] ?? null
    : null;


  return {
    holdsByEvent,
    activeHold,
    activeHoldCount,
    now,
    saveHold,
    removeHold,
    switchFanData,
    expireHold,
  };
}
