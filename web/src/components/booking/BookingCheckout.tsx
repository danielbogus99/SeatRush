import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import type { CreateHoldResult } from "@/types/hold.types";
import HoldTimer from "@/components/holds/HoldTimer";

interface BookingCheckoutProps {
  hold: CreateHoldResult;
  promoCode: string;
  isBusy: boolean;
  isCheckingOut: boolean;
  isReleasing: boolean;
  onPromoCodeChange: (value: string) => void;
  onCheckout: () => void;
  onRelease: () => void;
  onHoldExpired: () => void;
}

export default function BookingCheckout({
  hold,
  promoCode,
  isBusy,
  isCheckingOut,
  isReleasing,
  onPromoCodeChange,
  onCheckout,
  onRelease,
  onHoldExpired,
}: BookingCheckoutProps) {
  return (
    <Stack spacing={2}>
      <Alert severity="success">
        <Typography sx={{ fontWeight: 700 }}>
          Seats held successfully!
        </Typography>

        <Typography variant="body2" sx={{ mt: 1 }}>
          Hold ID: {hold.hold_id}
        </Typography>

        <Typography variant="body2" sx={{ mt: 1 }}>
          Seats: {hold.seat_ids.length}
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <HoldTimer
          key={hold.hold_id}
          expiresAt={hold.expires_at}
          onExpire={onHoldExpired}
        />

        <TextField
          fullWidth
          label="Promo Code"
          placeholder="SAVE10 or WELCOME20"
          value={promoCode}
          onChange={(event) => {
            onPromoCodeChange(event.target.value.toUpperCase());
          }}
          disabled={isBusy}
          slotProps={{
            htmlInput: {
              maxLength: 20,
            },
          }}
          helperText="Optional — one promo code per order"
          sx={{ mt: 3 }}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          sx={{ mt: 3 }}
          disabled={isBusy}
          onClick={onCheckout}
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
          onClick={onRelease}
        >
          {isReleasing ? "Releasing..." : "Release Hold"}
        </Button>
      </Paper>
    </Stack>
  );
}
