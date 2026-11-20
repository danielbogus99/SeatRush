import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Container, Paper, Stack, Typography } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";

import type { Event } from "@/types/event.types";
import type { Seat } from "@/types/seat.types";
import type { Fan } from "@/types/fan.types";
import type { CheckoutResult } from "@/types/order.types";

import { getEvents, getEventById } from "@/api/event.api";
import { errorMessage, formatSaleDate } from "@/utils/formatters";

import { useFan } from "@/hooks/useFan";
import { useEventHolds } from "@/hooks/useEventHolds";
import { useBooking } from "@/hooks/useBooking";

import LoginDialog from "@/components/auth/LoginDialog";
import CreateEventDialog from "@/components/admin/CreateEventDialog";
import AdminDashboard from "@/components/admin/AdminDashboard";
import BookingCheckout from "@/components/booking/BookingCheckout";
import BookingConfirmation from "@/components/booking/BookingConfirmation";
import EventsList from "@/components/events/EventsList";
import SeatMap from "@/components/seats/SeatMap";
import SeatSummary from "@/components/seats/SeatSummary";
import BestAvailableForm from "@/components/seats/BestAvailableForm";
import MyTickets from "@/components/tickets/MyTickets";

import "@/App.css";

type FanPage = "events" | "tickets";

function App() {
  const { fan, isLoggedIn, login, logout } = useFan();

  // Navigation
  const [currentPage, setCurrentPage] = useState<FanPage>("events");
  const [loginOpen, setLoginOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);

  // Events and seats
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  // Booking
  const [currentBooking, setCurrentBooking] = useState<CheckoutResult | null>(null);
  const [promoCode, setPromoCode] = useState("");

  // Loading and messages
  const [loading, setLoading] = useState(true);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Refs
  const operationInProgress = useRef(false);
  const selectedEventIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const selectedEventId = selectedEvent?.id ?? null;
  const completedOrder = currentBooking;

  // Operation helpers
  const isOperationInProgress = useCallback(
    () => operationInProgress.current,
    []
  );

  const setOperationInProgress = useCallback((value: boolean) => {
    operationInProgress.current = value;
  }, []);

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

  const handleSelectedHoldExpired = useCallback(
    async (eventId: string) => {
      if (selectedEventIdRef.current !== eventId) return;

      setSelectedSeatIds([]);
      setPromoCode("");
      setNotice("Your hold has expired. Please select your seats again.");

      try {
        await refreshSeats(eventId);
      } catch (err) {
        console.error("Failed to refresh expired hold:", err);
        setError("Failed to refresh seat availability.");
      }
    },
    [refreshSeats]
  );

  const {
    holdsByEvent,
    activeHold,
    now,
    saveHold,
    removeHold,
    switchFanData,
    expireHold,
  } = useEventHolds({
    fanId: fan?.id ?? null,
    selectedEventId,
    onSelectedHoldExpired: handleSelectedHoldExpired,
    isOperationInProgress,
  });

  const {
    isHolding,
    isFindingBestSeats,
    isReleasing,
    isCheckingOut,
    isBookingBusy,
    handleHoldSeats,
    handleBestAvailable,
    handleReleaseHold,
    handleCheckout,
  } = useBooking({
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
  });

  const isBusy = seatsLoading || isBookingBusy;

  const selectedSeats = seats.filter((seat) =>
    selectedSeatIds.includes(seat.id)
  );

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

  useEffect(() => {
    if (!selectedEventId || !isLoggedIn || currentPage !== "events") {
      return;
    }

    const interval = window.setInterval(() => {
      if (isOperationInProgress()) return;

      void refreshSeats(selectedEventId, false).catch((err) => {
        console.error("Seat polling failed:", err);
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [
    selectedEventId,
    isLoggedIn,
    currentPage,
    refreshSeats,
    isOperationInProgress,
  ]);

  function resetEventView() {
    ++requestIdRef.current;
    selectedEventIdRef.current = null;

    setSelectedEvent(null);
    setSeats([]);
    setSelectedSeatIds([]);
    setCurrentBooking(null);
    setPromoCode("");
    setError(null);
    setNotice(null);
  }

  function openMyTickets() {
    if (isOperationInProgress() || isBusy) return;

    resetEventView();
    setCurrentPage("tickets");
  }

  function backToEvents() {
    if (isOperationInProgress() || isBusy) return;

    resetEventView();
    setCurrentPage("events");
  }

  function goBack() {
    if (isOperationInProgress() || isBusy) return;

    resetEventView();
  }

  function handleLoginSuccess(newFan: Fan) {
    if (isOperationInProgress()) return;

    resetEventView();
    switchFanData(newFan.id);
    setCurrentPage("events");

    login(newFan);
    setLoginOpen(false);
    setCreateEventOpen(false);

    setNotice(`Welcome, ${newFan.username}!`);
  }

  function handleLogout() {
    if (isOperationInProgress() || isBusy) return;

    resetEventView();
    switchFanData(null);
    setCurrentPage("events");

    logout();

    setNotice("You have logged out successfully.");
  }

  function handleEventCreated(event: Event) {
    setEvents((previous) => {
      if (previous.some((item) => item.id === event.id)) {
        return previous;
      }

      return [event, ...previous];
    });

    setCreateEventOpen(false);
    setNotice(`Event "${event.name}" created successfully!`);
  }

  async function openEvent(eventId: string) {
    if (
      !fan ||
      currentPage !== "events" ||
      isOperationInProgress() ||
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

    setOperationInProgress(true);
    setSeatsLoading(true);
    setError(null);
    setNotice(null);
    setCurrentBooking(null);
    setPromoCode("");
    setSelectedSeatIds([]);

    const requestId = ++requestIdRef.current;
    selectedEventIdRef.current = eventId;

    try {
      const data = await getEventById(eventId);

      if (requestIdRef.current !== requestId) return;

      setSelectedEvent(data.event);
      setSeats(data.seats);

      const hold = holdsByEvent[eventId];

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
      setOperationInProgress(false);
      setSeatsLoading(false);
    }
  }

  function toggleSeat(seat: Seat) {
    if (
      !fan ||
      seat.status !== "AVAILABLE" ||
      isOperationInProgress() ||
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

  const handleHoldExpired = useCallback(async () => {
    if (!activeHold || isOperationInProgress()) return;

    await expireHold(activeHold, true);
  }, [activeHold, expireHold, isOperationInProgress]);

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

              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Chip
                  label={isLoggedIn ? "FAN MODE" : "ADMIN MODE"}
                  color={isLoggedIn ? "success" : "warning"}
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
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {notice && (
            <Alert severity="info" onClose={() => setNotice(null)}>
              {notice}
            </Alert>
          )}

          {!isLoggedIn && (
            <AdminDashboard
              events={events}
              onCreateEvent={() => setCreateEventOpen(true)}
            />
          )}

          {isLoggedIn && fan && (
            <Stack spacing={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                >
                  <Button
                    variant={currentPage === "events" ? "contained" : "outlined"}
                    startIcon={<EventOutlined />}
                    onClick={backToEvents}
                    disabled={isBusy}
                    sx={{ minWidth: 160 }}
                  >
                    Events
                  </Button>

                  <Button
                    variant={currentPage === "tickets" ? "contained" : "outlined"}
                    startIcon={<ConfirmationNumberOutlined />}
                    onClick={openMyTickets}
                    disabled={isBusy}
                    sx={{ minWidth: 160 }}
                  >
                    My Tickets
                  </Button>
                </Stack>
              </Paper>

              {currentPage === "tickets" ? (
                <MyTickets fanId={fan.id} onBack={backToEvents} />
              ) : !selectedEvent ? (
                <EventsList
                  events={events}
                  holdsByEvent={holdsByEvent}
                  now={now}
                  seatsLoading={seatsLoading}
                  onViewSeats={openEvent}
                />
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
                      onFindSeats={handleBestAvailable}
                    />
                  )}

                  <Box
                    sx={{
                      pointerEvents:
                        isBusy || activeHold || completedOrder
                          ? "none"
                          : "auto",
                      opacity: seatsLoading ? 0.6 : 1,
                    }}
                  >
                    <SeatMap
                      seats={seats}
                      selectedSeatIds={selectedSeatIds}
                      onSelectSeat={toggleSeat}
                    />
                  </Box>

                  {!activeHold && !completedOrder && (
                    <SeatSummary
                      selectedSeats={selectedSeats}
                      maxSeats={4}
                      onHoldSeats={handleHoldSeats}
                      isHolding={isHolding}
                    />
                  )}

                  {activeHold && (
                    <BookingCheckout
                      hold={activeHold}
                      promoCode={promoCode}
                      isBusy={isBusy}
                      isCheckingOut={isCheckingOut}
                      isReleasing={isReleasing}
                      onPromoCodeChange={(value) => {
                        setPromoCode(value);
                        setError(null);
                      }}
                      onCheckout={handleCheckout}
                      onRelease={handleReleaseHold}
                      onHoldExpired={() => {
                        void handleHoldExpired();
                      }}
                    />
                  )}

                  {completedOrder && (
                    <BookingConfirmation
                      order={completedOrder}
                      onBack={goBack}
                    />
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
        onLoginSuccess={handleLoginSuccess}
      />

      {!isLoggedIn && (
        <CreateEventDialog
          open={createEventOpen}
          onClose={() => setCreateEventOpen(false)}
          onCreated={handleEventCreated}
        />
      )}
    </Box>
  );
}

export default App;
