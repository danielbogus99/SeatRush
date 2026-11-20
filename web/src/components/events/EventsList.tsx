import { Alert, Box, Stack, Typography } from "@mui/material";
import type { Event } from "@/types/event.types";
import type { HoldsByEvent } from "@/utils/holdStorage";
import EventCard from "@/components/events/EventCard";

interface EventsListProps {
  events: Event[];
  holdsByEvent: HoldsByEvent;
  now: number;
  seatsLoading: boolean;
  onViewSeats: (eventId: string) => void | Promise<void>;
}

export default function EventsList({
  events,
  holdsByEvent,
  now,
  seatsLoading,
  onViewSeats,
}: EventsListProps) {
  const activeHoldCount = Object.values(holdsByEvent).filter(
    (hold) => Date.parse(hold.expires_at) > now
  ).length;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Available Events
        </Typography>

        <Typography color="text.secondary">
          Discover upcoming events and reserve your seats.
        </Typography>

        <Typography variant="body2" sx={{ mt: 1 }}>
          Active holds across events: {activeHoldCount}
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
          const hold = holdsByEvent[event.id];

          const hasActiveHold =
            hold !== undefined &&
            Date.parse(hold.expires_at) > now;

          return (
            <Box
              key={event.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <EventCard
                  event={event}
                  onViewSeats={onViewSeats}
                  loading={seatsLoading}
                />
              </Box>

              {hasActiveHold && (
                <Alert
                  severity="warning"
                  sx={{
                    mt: 1,
                    width: "100%",
                    boxSizing: "border-box",
                    "& .MuiAlert-message": {
                      width: "100%",
                      overflow: "visible",
                      overflowWrap: "anywhere",
                    },
                  }}
                >
                  Active Hold — {hold.seat_ids.length} seats
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
  );
}
