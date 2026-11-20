import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { Event } from "@/types/event.types";

interface AdminDashboardProps {
  events: Event[];
  onCreateEvent: () => void;
}

export default function AdminDashboard({
  events,
  onCreateEvent,
}: AdminDashboardProps) {
  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 4, borderRadius: 4 }}>
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
            onClick={onCreateEvent}
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

            <Typography variant="body2" sx={{ mt: 2 }}>
              Event date:{" "}
              {new Date(event.starts_at).toLocaleString()}
            </Typography>

            <Typography variant="body2">
              Ticket drop:{" "}
              {new Date(event.on_sale_at).toLocaleString()}
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
  );
}
