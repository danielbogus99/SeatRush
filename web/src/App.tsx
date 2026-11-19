
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Container, Paper, Stack, Typography } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";

import type { Event } from "@/types/event.types";
import type { Seat } from "@/types/seat.types";
import type { Fan } from "@/types/fan.types";
import type { CreateHoldResult } from "@/types/hold.types";
import type { CheckoutResult } from "@/types/order.types";
import type { BestAvailableInput } from "@/types/bestAvailable.types";

import { getEvents, getEventById } from "@/api/event.api";
import { createHold, releaseHold } from "@/api/hold.api";
import { checkout } from "@/api/order.api";
import { createBestAvailableHold } from "@/api/bestAvailable.api";

import { useFan } from "@/hooks/useFan";
import LoginDialog from "@/components/auth/LoginDialog";
import CreateEventDialog from "@/components/admin/CreateEventDialog";
import EventCard from "@/components/events/EventCard";
import SeatMap from "@/components/seats/SeatMap";
import SeatSummary from "@/components/seats/SeatSummary";
import BestAvailableForm from "@/components/seats/BestAvailableForm";
import HoldTimer from "@/components/holds/HoldTimer";
import MyTickets from "@/components/tickets/MyTickets";

import "@/App.css";

type HoldsByEvent = Record<string, CreateHoldResult>;
type FanPage = "events" | "tickets";

const HOLDS_PREFIX = "seatrush_active_holds_";

function getHoldsKey(fanId: string): string {
  return `${HOLDS_PREFIX}${fanId}`;
}

function isValidHold(
  value: unknown,
  eventId: string,
  fanId: string
): value is CreateHoldResult {
  if (!value || typeof value !== "object") return false;

  const hold = value as Partial<CreateHoldResult>;

  return (
    typeof hold.hold_id === "string" &&
    hold.event_id === eventId &&
    hold.fan_id === fanId &&
    Array.isArray(hold.seat_ids) &&
    hold.seat_ids.every((id) => typeof id === "string") &&
    typeof hold.expires_at === "string" &&
    Number.isFinite(Date.parse(hold.expires_at)) &&
    Date.parse(hold.expires_at) > Date.now()
  );
}

function loadHolds(fanId: string | null): HoldsByEvent {
  if (!fanId) return {};

  try {
    const saved = sessionStorage.getItem(getHoldsKey(fanId));
    if (!saved) return {};

    const parsed: unknown = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const result: HoldsByEvent = {};

    for (const [eventId, value] of Object.entries(parsed)) {
      if (isValidHold(value, eventId, fanId)) {
        result[eventId] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  if (/single isolated seat/i.test(error.message)) {
    return "This selection would leave a single isolated seat. Please choose different seats.";
  }

  if (/409|conflict|unavailable|already held/i.test(error.message)) {
    return "These seats are no longer available. Please choose different seats.";
  }

  return error.message;
}

function formatSaleDate(date: string): string {
  return new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function App() {
  const { fan, isLoggedIn, login, logout } = useFan();

  // Navigation
  const [currentPage, setCurrentPage] = useState<FanPage>("events");

  // Dialogs
  const [loginOpen, setLoginOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);

  // Events and seats
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  // Holds
  const [holdsByEvent, setHoldsByEvent] = useState<HoldsByEvent>(
    () => loadHolds(fan?.id ?? null)
  );

  // Only the booking confirmed in the current flow.
  // Historical orders are loaded by MyTickets from the backend.
  const [currentBooking, setCurrentBooking] = useState<CheckoutResult | null>(
    null
  );

  // Clock
  const [now, setNow] = useState(() => Date.now());

  // Loading states
  const [loading, setLoading] = useState(true);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isFindingBestSeats, setIsFindingBestSeats] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Refs
  const operationInProgress = useRef(false);
  const selectedEventIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const expiredHoldIds = useRef<Set<string>>(new Set());

  const fanIdRef = useRef<string | null>(fan?.id ?? null);
  const holdsRef = useRef<HoldsByEvent>(holdsByEvent);

  // Derived values
  const selectedEventId = selectedEvent?.id ?? null;

  const activeHold = selectedEventId
    ? holdsByEvent[selectedEventId] ?? null
    : null;

  const completedOrder = currentBooking;

  const isBusy =
    seatsLoading ||
    isHolding ||
    isFindingBestSeats ||
    isReleasing ||
    isCheckingOut;

  const activeHoldCount = Object.values(holdsByEvent).filter(
    (hold) => Date.parse(hold.expires_at) > now
  ).length;

  const selectedSeats = seats.filter((seat) =>
    selectedSeatIds.includes(seat.id)
  );

  // -----------------------------
  // Hold storage
  // -----------------------------

  const updateHolds = useCallback(
    (next: HoldsByEvent, ownerId: string) => {
      if (fanIdRef.current !== ownerId) return;

      holdsRef.current = next;
      setHoldsByEvent(next);

      try {
        sessionStorage.setItem(
          getHoldsKey(ownerId),
          JSON.stringify(next)
        );
      } catch (err) {
        console.error("Failed to save holds:", err);
      }
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

  // -----------------------------
  // Refresh seats
  // -----------------------------

  const refreshSeats = useCallback(
    async (eventId: string, clearSelection = true) => {
      const requestId = ++requestIdRef.current;
      const data = await getEventById(eventId);

      if (
        selectedEventIdRef.current !== eventId ||
        requestIdRef.current !== requestId
      ) {
        return;
      }

      setSeats(data.seats);

      if (clearSelection) {
        setSelectedSeatIds([]);
      }
    },
    []
  );

  // -----------------------------
  // Expired holds
  // -----------------------------

  const expireHold = useCallback(
    async (hold: CreateHoldResult, showMessage: boolean) => {
      if (fanIdRef.current !== hold.fan_id) return;
      if (expiredHoldIds.current.has(hold.hold_id)) return;

      expiredHoldIds.current.add(hold.hold_id);
      removeHold(hold.event_id, hold.hold_id, hold.fan_id);

      if (selectedEventIdRef.current === hold.event_id) {
        setSelectedSeatIds([]);

        if (showMessage) {
          setNotice(
            "Your hold has expired. Please select your seats again."
          );
        }

        try {
          await refreshSeats(hold.event_id);
        } catch (err) {
          console.error("Failed to refresh expired hold:", err);
          setError("Failed to refresh seat availability.");
        }
      }
    },
    [removeHold, refreshSeats]
  );

  // -----------------------------
  // Fetch events
  // -----------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        const data = await getEvents();

        if (!cancelled) {
          setEvents(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err, "Failed to load events"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------
  // Clock and hold expiration
  // -----------------------------

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (operationInProgress.current) return;

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

  // -----------------------------
  // Seat polling
  // -----------------------------

  useEffect(() => {
    if (
      !selectedEventId ||
      !isLoggedIn ||
      currentPage !== "events"
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      if (operationInProgress.current) return;

      void refreshSeats(selectedEventId, false).catch((err) => {
        console.error("Seat polling failed:", err);
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [selectedEventId, isLoggedIn, currentPage, refreshSeats]);

  // -----------------------------
  // Navigation helpers
  // -----------------------------

  function resetEventView() {
    ++requestIdRef.current;
    selectedEventIdRef.current = null;

    setSelectedEvent(null);
    setSeats([]);
    setSelectedSeatIds([]);
    setCurrentBooking(null);
    setError(null);
    setNotice(null);
  }

  function openMyTickets() {
    if (operationInProgress.current || isBusy) return;

    resetEventView();
    setCurrentPage("tickets");
  }

  function backToEvents() {
    if (operationInProgress.current || isBusy) return;

    resetEventView();
    setCurrentPage("events");
  }

  function goBack() {
    if (operationInProgress.current || isBusy) return;

    resetEventView();
  }

  // -----------------------------
  // Fan session
  // -----------------------------

  function switchFanData(fanId: string | null) {
    fanIdRef.current = fanId;

    const nextHolds = loadHolds(fanId);

    holdsRef.current = nextHolds;
    setHoldsByEvent(nextHolds);

    expiredHoldIds.current.clear();
    setCurrentBooking(null);
  }

  function handleLoginSuccess(newFan: Fan) {
    if (operationInProgress.current) return;

    resetEventView();
    switchFanData(newFan.id);
    setCurrentPage("events");

    login(newFan);
    setLoginOpen(false);
    setCreateEventOpen(false);

    setNotice(`Welcome, ${newFan.username}!`);
  }

  function handleLogout() {
    if (operationInProgress.current || isBusy) return;

    resetEventView();
    switchFanData(null);
    setCurrentPage("events");

    logout();

    setNotice("You have logged out successfully.");
  }

  // -----------------------------
  // Create event
  // -----------------------------

  function handleEventCreated(event: Event) {
    setEvents((previous) => {
      if (previous.some((item) => item.id === event.id)) {
        return previous;
      }

      return [event, ...previous];
    });

    setCreateEventOpen(false);
    setNotice(
      `Event "${event.name}" created successfully!`
    );
  }

  // -----------------------------
  // Open event
  // -----------------------------

  async function openEvent(eventId: string) {
    if (
      !fanIdRef.current ||
      currentPage !== "events" ||
      operationInProgress.current ||
      seatsLoading
    ) {
      return;
    }

    const event = events.find((item) => item.id === eventId);

    if (!event) {
      setError("Event not found.");
      return;
    }

    const saleStartTime = new Date(event.on_sale_at).getTime();

    if (!Number.isFinite(saleStartTime)) {
      setError("Invalid ticket sale date for this event.");
      return;
    }

    if (Date.now() < saleStartTime) {
      setError(
        `Ticket sales for "${event.name}" begin on ${formatSaleDate(event.on_sale_at)}.`
      );
      return;
    }

    operationInProgress.current = true;
    setSeatsLoading(true);
    setError(null);
    setNotice(null);
    setCurrentBooking(null);
    setSelectedSeatIds([]);

    const requestId = ++requestIdRef.current;
    selectedEventIdRef.current = eventId;

    try {
      const data = await getEventById(eventId);

      if (requestIdRef.current !== requestId) return;

      setSelectedEvent(data.event);
      setSeats(data.seats);

      const hold = holdsRef.current[eventId];

      if (hold) {
        if (Date.parse(hold.expires_at) > Date.now()) {
          setSelectedSeatIds(hold.seat_ids);
        } else {
          removeHold(eventId, hold.hold_id, hold.fan_id);
        }
      }
    } catch (err) {
      selectedEventIdRef.current = null;
      setError(errorMessage(err, "Failed to load event seats"));
    } finally {
      operationInProgress.current = false;
      setSeatsLoading(false);
    }
  }

  // -----------------------------
  // Seat selection
  // -----------------------------

  function toggleSeat(seat: Seat) {
    if (
      !fan ||
      seat.status !== "AVAILABLE" ||
      operationInProgress.current ||
      activeHold ||
      completedOrder
    ) {
      return;
    }

    setSelectedSeatIds((previous) => {
      if (previous.includes(seat.id)) {
        return previous.filter((id) => id !== seat.id);
      }

      if (previous.length >= 4) return previous;

      return [...previous, seat.id];
    });
  }

  // -----------------------------
  // Hold seats
  // -----------------------------

  async function handleHoldSeats() {
    if (
      !fan ||
      !selectedEvent ||
      selectedSeatIds.length === 0 ||
      activeHold ||
      completedOrder ||
      operationInProgress.current
    ) {
      return;
    }

    operationInProgress.current = true;
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
        setNotice(
          "Seats held, but the map could not be refreshed."
        );
      }
    } catch (err) {
      setError(errorMessage(err, "Failed to create hold"));

      try {
        await refreshSeats(eventId);
      } catch (refreshError) {
        console.error("Seat refresh failed:", refreshError);
      }
    } finally {
      operationInProgress.current = false;
      setIsHolding(false);
    }
  }

  // -----------------------------
  // Best available
  // -----------------------------

  async function handleBestAvailable(
    input: BestAvailableInput
  ): Promise<void> {
    if (
      !fan ||
      !selectedEvent ||
      activeHold ||
      completedOrder ||
      operationInProgress.current
    ) {
      return;
    }

    operationInProgress.current = true;
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
        setNotice(
          "Seats held, but the map could not be refreshed."
        );
      }
    } catch (err) {
      setError(
        errorMessage(err, "Failed to find best available seats")
      );

      try {
        await refreshSeats(eventId);
      } catch (refreshError) {
        console.error("Seat refresh failed:", refreshError);
      }
    } finally {
      operationInProgress.current = false;
      setIsFindingBestSeats(false);
    }
  }

  // -----------------------------
  // Release hold
  // -----------------------------

  async function handleReleaseHold() {
    if (
      !fan ||
      !activeHold ||
      activeHold.fan_id !== fan.id ||
      operationInProgress.current
    ) {
      return;
    }

    operationInProgress.current = true;
    setIsReleasing(true);
    setError(null);
    setNotice(null);

    const hold = activeHold;

    try {
      await releaseHold(hold.hold_id, {
        fan_id: hold.fan_id,
      });

      removeHold(
        hold.event_id,
        hold.hold_id,
        hold.fan_id
      );

      setSelectedSeatIds([]);
      setNotice(
        "Your seats have been released successfully."
      );

      try {
        await refreshSeats(hold.event_id);
      } catch (err) {
        console.error("Seat refresh failed:", err);
        setError(
          "Hold released, but failed to refresh seats."
        );
      }
    } catch (err) {
      setError(
        errorMessage(err, "Failed to release hold")
      );
    } finally {
      operationInProgress.current = false;
      setIsReleasing(false);
    }
  }

  // -----------------------------
  // Checkout
  // -----------------------------

  async function handleCheckout() {
    if (
      !fan ||
      !activeHold ||
      activeHold.fan_id !== fan.id ||
      operationInProgress.current
    ) {
      return;
    }

    const hold = activeHold;

    if (Date.parse(hold.expires_at) <= Date.now()) {
      await expireHold(hold, true);
      return;
    }

    operationInProgress.current = true;
    setIsCheckingOut(true);
    setError(null);
    setNotice(null);

    try {
      const order = await checkout(hold.hold_id, {
        fan_id: hold.fan_id,
      });

      removeHold(
        hold.event_id,
        hold.hold_id,
        hold.fan_id
      );

      setCurrentBooking(order);
      setSelectedSeatIds([]);

      try {
        await refreshSeats(hold.event_id);
      } catch (err) {
        console.error("Seat refresh failed:", err);
        setNotice(
          "Booking confirmed, but seat refresh failed."
        );
      }
    } catch (err) {
      setError(
        errorMessage(err, "Failed to complete booking")
      );
    } finally {
      operationInProgress.current = false;
      setIsCheckingOut(false);
    }
  }

  const handleHoldExpired = useCallback(async () => {
    if (!activeHold || operationInProgress.current) return;

    await expireHold(activeHold, true);
  }, [activeHold, expireHold]);

  // -----------------------------
  // Initial loading
  // -----------------------------

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Loading events...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              justifyContent: "space-between",
              alignItems: {
                xs: "flex-start",
                sm: "center",
              },
            }}
          >
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: "primary.main",
                }}
              >
                SeatRush
              </Typography>

              <Typography color="text.secondary">
                Your seat. Your experience.
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 2 }}
              >
                <Chip
                  label={
                    isLoggedIn ? "FAN MODE" : "ADMIN MODE"
                  }
                  color={
                    isLoggedIn ? "success" : "warning"
                  }
                  size="small"
                />

                {fan && (
                  <Chip
                    label={fan.username}
                    variant="outlined"
                    size="small"
                  />
                )}
              </Stack>
            </Box>

            {isLoggedIn ? (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<LogoutOutlined />}
                onClick={handleLogout}
                disabled={isBusy}
              >
                Log Out
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<LoginOutlined />}
                onClick={() => setLoginOpen(true)}
              >
                Log In
              </Button>
            )}
          </Stack>

          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {notice && (
            <Alert
              severity="info"
              onClose={() => setNotice(null)}
            >
              {notice}
            </Alert>
          )}

          {!isLoggedIn && (
            <Stack spacing={3}>
              <Paper
                sx={{ p: 4, borderRadius: 4 }}
              >
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  spacing={2}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: {
                      xs: "flex-start",
                      sm: "center",
                    },
                  }}
                >
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700 }}
                      gutterBottom
                    >
                      Admin Dashboard
                    </Typography>

                    <Typography color="text.secondary">
                      Create and manage events and ticket drops.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={() =>
                      setCreateEventOpen(true)
                    }
                  >
                    + Create Event
                  </Button>
                </Stack>
              </Paper>

              <Typography variant="h5">
                Existing Events ({events.length})
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    md: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 3,
                }}
              >
                {events.map((event) => (
                  <Paper
                    key={event.id}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                    }}
                  >
                    <Typography variant="h6">
                      {event.name}
                    </Typography>

                    <Typography color="text.secondary">
                      {event.venue}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{ mt: 2 }}
                    >
                      Event date:{" "}
                      {new Date(
                        event.starts_at
                      ).toLocaleString()}
                    </Typography>

                    <Typography variant="body2">
                      Ticket drop:{" "}
                      {new Date(
                        event.on_sale_at
                      ).toLocaleString()}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              {events.length === 0 && (
                <Alert severity="info">
                  No events have been created yet.
                </Alert>
              )}
            </Stack>
          )}

          {isLoggedIn && fan && (
            <Stack spacing={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                }}
              >
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  spacing={2}
                >
                  <Button
                    variant={
                      currentPage === "events"
                        ? "contained"
                        : "outlined"
                    }
                    startIcon={<EventOutlined />}
                    onClick={backToEvents}
                    disabled={isBusy}
                    sx={{ minWidth: 160 }}
                  >
                    Events
                  </Button>

                  <Button
                    variant={
                      currentPage === "tickets"
                        ? "contained"
                        : "outlined"
                    }
                    startIcon={
                      <ConfirmationNumberOutlined />
                    }
                    onClick={openMyTickets}
                    disabled={isBusy}
                    sx={{ minWidth: 160 }}
                  >
                    My Tickets
                  </Button>
                </Stack>
              </Paper>

              {currentPage === "tickets" ? (
                <MyTickets
                  fanId={fan.id}
                  onBack={backToEvents}
                />
              ) : !selectedEvent ? (
                <Stack spacing={3}>
                  <Box>
                    <Typography
                      variant="h4"
                      gutterBottom
                    >
                      Available Events
                    </Typography>

                    <Typography color="text.secondary">
                      Discover upcoming events and reserve
                      your seats.
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{ mt: 1 }}
                    >
                      Active holds across events:{" "}
                      {activeHoldCount}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 3,
                    }}
                  >
                    {events.map((event) => {
                      const hold =
                        holdsByEvent[event.id];

                      const hasActiveHold =
                        hold !== undefined &&
                        Date.parse(
                          hold.expires_at
                        ) > now;

                      return (
                        <Box key={event.id}>
                          <EventCard
                            event={event}
                            onViewSeats={openEvent}
                            loading={seatsLoading}
                          />

                          {hasActiveHold && (
                            <Alert
                              severity="warning"
                              sx={{ mt: 1 }}
                            >
                              Active Hold —{" "}
                              {hold.seat_ids.length} seats
                            </Alert>
                          )}
                        </Box>
                      );
                    })}
                  </Box>

                  {events.length === 0 && (
                    <Alert severity="info">
                      No events available at the moment.
                    </Alert>
                  )}
                </Stack>
              ) : (
                <Stack spacing={4}>
                  <Box>
                    <Button
                      startIcon={<ArrowBack />}
                      onClick={goBack}
                      disabled={isBusy}
                      sx={{ mb: 3 }}
                    >
                      Back to Events
                    </Button>

                    <Typography variant="h4">
                      {selectedEvent.name}
                    </Typography>

                    <Typography color="text.secondary">
                      {selectedEvent.venue}
                    </Typography>
                  </Box>

                  {!activeHold && !completedOrder && (
                    <BestAvailableForm
                      seats={seats}
                      fanId={fan.id}
                      loading={isFindingBestSeats}
                      disabled={isBusy}
                      onFindSeats={
                        handleBestAvailable
                      }
                    />
                  )}

                  <Box
                    sx={{
                      pointerEvents:
                        isBusy ||
                        activeHold ||
                        completedOrder
                          ? "none"
                          : "auto",
                      opacity: seatsLoading ? 0.6 : 1,
                    }}
                  >
                    <SeatMap
                      seats={seats}
                      selectedSeatIds={
                        selectedSeatIds
                      }
                      onSelectSeat={toggleSeat}
                    />
                  </Box>

                  {!activeHold && !completedOrder && (
                    <SeatSummary
                      selectedSeats={
                        selectedSeats
                      }
                      maxSeats={4}
                      onHoldSeats={
                        handleHoldSeats
                      }
                      isHolding={isHolding}
                    />
                  )}

                  {activeHold && (
                    <Stack spacing={2}>
                      <Alert severity="success">
                        <Typography
                          sx={{ fontWeight: 700 }}
                        >
                          Seats held successfully!
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{ mt: 1 }}
                        >
                          Hold ID:{" "}
                          {activeHold.hold_id}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{ mt: 1 }}
                        >
                          Seats:{" "}
                          {activeHold.seat_ids.length}
                        </Typography>
                      </Alert>

                      <Paper
                        sx={{
                          p: 3,
                          borderRadius: 4,
                        }}
                      >
                        <HoldTimer
                          key={
                            activeHold.hold_id
                          }
                          expiresAt={
                            activeHold.expires_at
                          }
                          onExpire={
                            handleHoldExpired
                          }
                        />

                        <Button
                          variant="contained"
                          size="large"
                          fullWidth
                          sx={{ mt: 3 }}
                          disabled={isBusy}
                          onClick={
                            handleCheckout
                          }
                        >
                          {isCheckingOut
                            ? "Completing Booking..."
                            : "Complete Booking"}
                        </Button>

                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          sx={{ mt: 2 }}
                          disabled={isBusy}
                          onClick={
                            handleReleaseHold
                          }
                        >
                          {isReleasing
                            ? "Releasing..."
                            : "Release Hold"}
                        </Button>
                      </Paper>
                    </Stack>
                  )}

                  {completedOrder && (
                    <Paper
                      sx={{
                        p: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Stack
                        spacing={2}
                        sx={{
                          alignItems: "center",
                        }}
                      >
                        <CheckCircleOutlined
                          color="success"
                          sx={{ fontSize: 60 }}
                        />

                        <Typography
                          variant="h4"
                          sx={{ fontWeight: 700 }}
                        >
                          Booking Confirmed!
                        </Typography>

                        <Typography color="text.secondary">
                          Your seats have been booked
                          successfully.
                        </Typography>

                        <Box
                          sx={{
                            width: "100%",
                            mt: 2,
                          }}
                        >
                          <Stack spacing={1}>
                            <Typography variant="body2">
                              Order ID:{" "}
                              {completedOrder.order_id}
                            </Typography>

                            <Typography variant="body2">
                              Hold ID:{" "}
                              {completedOrder.hold_id}
                            </Typography>

                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 700 }}
                            >
                              Total: ₪
                              {(
                                completedOrder.total_agorot /
                                100
                              ).toFixed(2)}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Booking Date:{" "}
                              {new Date(
                                completedOrder.created_at
                              ).toLocaleString()}
                            </Typography>
                          </Stack>
                        </Box>

                        <Button
                          variant="contained"
                          fullWidth
                          sx={{ mt: 3 }}
                          onClick={goBack}
                        >
                          Back to Events
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Container>

      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={
          handleLoginSuccess
        }
      />

      {!isLoggedIn && (
        <CreateEventDialog
          open={createEventOpen}
          onClose={() =>
            setCreateEventOpen(false)
          }
          onCreated={
            handleEventCreated
          }
        />
      )}
    </Box>
  );
}

export default App;
