
import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { getMyTickets } from "@/api/myTickets.api";
import type { MyTicket } from "@/types/myTickets.types";

interface MyTicketsProps {
  fanId: string;
  onBack: () => void;
}

export default function MyTickets({ fanId, onBack }: MyTicketsProps) {
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTickets() {
      setLoading(true);
      setError(null);
      setTickets([]);

      try {
        const result = await getMyTickets(fanId);

        if (active) {
          setTickets(result);
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load tickets"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadTickets();

    return () => {
      active = false;
    };
  }, [fanId]);

  return (
    <Box sx={{ mt: 3 }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          mb: 3,
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            My Tickets
          </Typography>

          <Typography color="text.secondary">
            View all your confirmed ticket orders.
          </Typography>
        </Box>

        <Button variant="outlined" onClick={onBack}>
          Back to Events
        </Button>
      </Stack>

      {/* Loading */}
      {loading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: 6,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {!loading && error && (
        <Alert severity="error">{error}</Alert>
      )}

      {/* Empty */}
      {!loading && !error && tickets.length === 0 && (
        <Alert severity="info">
          You have not purchased any tickets yet.
        </Alert>
      )}

      {/* Tickets */}
      {!loading && !error && tickets.length > 0 && (
        <Stack spacing={2}>
          <Typography color="text.secondary">
            {tickets.length} confirmed orders
          </Typography>

          {tickets.map((ticket) => (
            <Card key={ticket.order_id} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  {/* Event title */}
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700 }}
                    >
                      {ticket.event_name}
                    </Typography>

                    <Chip
                      label="Confirmed"
                      color="success"
                      size="small"
                    />
                  </Stack>

                  {/* Event details */}
                  <Typography color="text.secondary">
                    Venue: {ticket.venue}
                  </Typography>

                  <Typography color="text.secondary">
                    Event Date:{" "}
                    {new Date(ticket.starts_at).toLocaleString()}
                  </Typography>

                  <Divider />

                  {/* Order details */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Tickets
                      </Typography>

                      <Typography sx={{ fontWeight: 600 }}>
                        {ticket.seat_ids.length} seats
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Total Paid
                      </Typography>

                      <Typography sx={{ fontWeight: 700 }}>
                        ₪{(ticket.total_agorot / 100).toFixed(2)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    Order ID: {ticket.order_id}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
