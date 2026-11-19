import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { EventSeat } from "@mui/icons-material";
import type { Seat } from "@/types/seat.types";

interface SeatSummaryProps {
  selectedSeats: Seat[];
  maxSeats?: number;
  onHoldSeats: () => void;
  isHolding?: boolean;
}

export default function SeatSummary({
  selectedSeats,
  maxSeats = 4,
  onHoldSeats,
  isHolding = false,
}: SeatSummaryProps) {
  const totalPriceAgorot = selectedSeats.reduce(
    (total, seat) => total + seat.price_agorot,
    0
  );

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Stack spacing={3}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center" }}
        >
          <EventSeat color="primary" />

          <Typography variant="h6">
            Selected Seats: {selectedSeats.length}/{maxSeats}
          </Typography>
        </Stack>

        {selectedSeats.length === 0 ? (
          <Typography color="text.secondary">
            Select seats from the map above.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {selectedSeats.map((seat) => (
              <Box
                key={seat.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Typography>
                  {seat.row_label}
                  {seat.seat_number} — {seat.zone_name}
                </Typography>

                <Typography sx={{ fontWeight: 600 }}>
                  ₪{seat.price_agorot / 100}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            pt: 2,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">Total</Typography>

          <Typography
            variant="h6"
            sx={{ color: "primary.main" }}
          >
            ₪{totalPriceAgorot / 100}
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={selectedSeats.length === 0 || isHolding}
          loading={isHolding}
          onClick={onHoldSeats}
        >
          Hold Selected Seats
        </Button>
      </Stack>
    </Paper>
  );
}
