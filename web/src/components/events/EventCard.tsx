
import { useEffect, useState } from "react";
import { Card, CardContent, CardActions, Typography, Button, Stack, Chip, Box } from "@mui/material";
import { CalendarMonth, LocationOn, ConfirmationNumber, AccessTime } from "@mui/icons-material";
import type { Event } from "@/types/event.types";
import { useFan } from "@/hooks/useFan";

interface EventCardProps {
  event: Event;
  onViewSeats: (eventId: string) => void;
  loading: boolean;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return "Sale is open!";

  const totalSeconds = Math.ceil(milliseconds / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default function EventCard({
  event,
  onViewSeats,
  loading,
}: EventCardProps) {
  const { isLoggedIn } = useFan();

  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    function updateTime() {
      setCurrentTime(Date.now());
    }

    updateTime();

    const interval = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const saleStartTime = new Date(event.on_sale_at).getTime();

  const saleStarted =
    currentTime !== null &&
    Number.isFinite(saleStartTime) &&
    currentTime >= saleStartTime;

  const isAdmin = !isLoggedIn;
  const canViewSeats = isAdmin || saleStarted;

  const timeRemaining =
    currentTime === null ? 0 : saleStartTime - currentTime;

  return (
    <Card
      sx={{
        maxWidth: 420,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 8,
        },
      }}
    >
      <CardContent sx={{ p: 3, flexGrow: 1 }}>
        <Stack spacing={2}>
          <Chip
            icon={
              isAdmin || saleStarted
                ? <ConfirmationNumber />
                : <AccessTime />
            }
            label={
              isAdmin
                ? "Admin Preview"
                : saleStarted
                  ? "On Sale"
                  : "Sale Not Started"
            }
            color={
              isAdmin
                ? "primary"
                : saleStarted
                  ? "success"
                  : "warning"
            }
            size="small"
            sx={{ alignSelf: "flex-start" }}
          />

          <Typography variant="h5">
            {event.name}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center" }}
          >
            <LocationOn color="secondary" fontSize="small" />

            <Typography color="text.secondary">
              {event.venue}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center" }}
          >
            <CalendarMonth color="secondary" fontSize="small" />

            <Typography color="text.secondary">
              {formatDate(event.starts_at)}
            </Typography>
          </Stack>

          <Box
            sx={{
              p: 2,
              bgcolor: "action.hover",
              borderRadius: 2,
            }}
          >
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                TICKET SALES OPEN
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center" }}
              >
                <AccessTime color="primary" fontSize="small" />

                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                >
                  {formatDate(event.on_sale_at)}
                </Typography>
              </Stack>

              {!saleStarted && Number.isFinite(saleStartTime) && (
                <Typography
                  variant="body2"
                  color="warning.main"
                  sx={{ fontWeight: 700 }}
                >
                  {currentTime === null
                    ? "Loading countdown..."
                    : `Starts in: ${formatCountdown(timeRemaining)}`}
                </Typography>
              )}

              {saleStarted && (
                <Typography
                  variant="body2"
                  color="success.main"
                  sx={{ fontWeight: 700 }}
                >
                  Ticket sales are now open!
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => onViewSeats(event.id)}
          disabled={loading || !canViewSeats}
        >
          {!isAdmin && !saleStarted
            ? "Sale Not Started"
            : isAdmin && !saleStarted
              ? "Preview Seats"
              : "View Seats"}
        </Button>
      </CardActions>
    </Card>
  );
}
