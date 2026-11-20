import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import type { CheckoutResult } from "@/types/order.types";
import { formatPrice } from "@/utils/formatters";

interface BookingConfirmationProps {
  order: CheckoutResult;
  onBack: () => void;
}

export default function BookingConfirmation({
  order,
  onBack,
}: BookingConfirmationProps) {
  return (
    <Paper sx={{ p: 4, borderRadius: 4 }}>
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <CheckCircleOutlined
          color="success"
          sx={{ fontSize: 60 }}
        />

        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Booking Confirmed!
        </Typography>

        <Typography color="text.secondary">
          Your seats have been booked successfully.
        </Typography>

        <Box sx={{ width: "100%", mt: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">
              Order ID: {order.order_id}
            </Typography>

            <Typography variant="body2">
              Hold ID: {order.hold_id}
            </Typography>

            <Typography variant="body2">
              Subtotal: {formatPrice(order.subtotal_agorot)}
            </Typography>

            {order.promo_code && (
              <>
                <Typography
                  variant="body2"
                  color="success.main"
                >
                  Promo Code: {order.promo_code}
                </Typography>

                <Typography
                  variant="body2"
                  color="success.main"
                >
                  Discount: -{formatPrice(order.discount_agorot)}
                </Typography>
              </>
            )}

            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Total: {formatPrice(order.total_agorot)}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Booking Date:{" "}
              {new Date(order.created_at).toLocaleString()}
            </Typography>
          </Stack>
        </Box>

        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 3 }}
          onClick={onBack}
        >
          Back to Events
        </Button>
      </Stack>
    </Paper>
  );
}
