import { Button, Tooltip } from "@mui/material";
import type { Seat } from "@/types/seat.types";

interface SeatButtonProps {
  seat: Seat;
  isSelected: boolean;
  onSelect: (seat: Seat) => void;
}

export default function SeatButton({
  seat,
  isSelected,
  onSelect,
}: SeatButtonProps) {
  const isAvailable = seat.status === "AVAILABLE";

  const backgroundColor = isSelected
    ? "#2563EB"
    : seat.status === "AVAILABLE"
      ? "#16A34A"
      : seat.status === "HELD"
        ? "#EAB308"
        : "#DC2626";

  return (
    <Tooltip
      title={`${seat.zone_name} | ${seat.status} | ₪${seat.price_agorot / 100}`}
      arrow
    >
      <span>
        <Button
          variant="contained"
          onClick={() => onSelect(seat)}
          disabled={!isAvailable}
          aria-label={`Seat ${seat.row_label}${seat.seat_number}, ${seat.status}`}
          sx={{
            minWidth: 52,
            width: 52,
            height: 52,
            p: 0,
            backgroundColor,
            color: "#FFFFFF",
            border: isSelected
              ? "3px solid white"
              : "3px solid transparent",
            "&:hover": {
              backgroundColor,
              filter: "brightness(1.15)",
            },
            "&.Mui-disabled": {
              backgroundColor,
              color: "#FFFFFF",
              opacity: 0.55,
            },
          }}
        >
          {seat.row_label}
          {seat.seat_number}
        </Button>
      </span>
    </Tooltip>
  );
}
