
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { Seat } from "@/types/seat.types";
import SeatButton from "@/components/seats/SeatButton";

interface SeatMapProps {
  seats: Seat[];
  selectedSeatIds: string[];
  onSelectSeat: (seat: Seat) => void;
}

const seatLegend = [
  { label: "Available", color: "#16A34A" },
  { label: "Held", color: "#EAB308" },
  { label: "Sold", color: "#DC2626" },
  { label: "Selected", color: "#2563EB" },
];

export default function SeatMap({
  seats,
  selectedSeatIds,
  onSelectSeat,
}: SeatMapProps) {
  const rowLabels = [
    ...new Set(seats.map((seat) => seat.row_label)),
  ].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  return (
    <Paper
      sx={{
        p: { xs: 2, md: 4 },
        borderRadius: 4,
      }}
    >
      <Typography variant="h6" sx={{ mb: 3 }}>
        Choose Your Seats
      </Typography>

      <Box
        sx={{
          maxWidth: 550,
          mx: "auto",
          mb: 4,
          p: 2,
          borderRadius: 2,
          textAlign: "center",
          background:
            "linear-gradient(90deg, #4338CA, #06B6D4)",
          boxShadow: "0 8px 30px rgba(99,102,241,0.2)",
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            letterSpacing: 4,
            color: "#FFFFFF",
          }}
        >
          STAGE
        </Typography>
      </Box>

      <Box sx={{ overflowX: "auto", pb: 2 }}>
        <Stack
          spacing={2}
          sx={{
            alignItems: "center",
            minWidth: "max-content",
          }}
        >
          {rowLabels.map((rowLabel) => (
            <Stack
              key={rowLabel}
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  width: 32,
                  fontWeight: 700,
                }}
              >
                {rowLabel}
              </Typography>

              {seats
                .filter(
                  (seat) => seat.row_label === rowLabel
                )
                .sort(
                  (a, b) => a.seat_number - b.seat_number
                )
                .map((seat) => (
                  <SeatButton
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatIds.includes(
                      seat.id
                    )}
                    onSelect={onSelectSeat}
                  />
                ))}
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 2,
          mt: 3,
        }}
      >
        {seatLegend.map((item) => (
          <Box
            key={item.label}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: item.color,
              }}
            />

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
