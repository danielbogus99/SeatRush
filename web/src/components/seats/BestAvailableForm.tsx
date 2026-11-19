import { useState } from "react";
import { Alert, Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { AutoAwesome } from "@mui/icons-material";
import type { SelectChangeEvent } from "@mui/material";
import type { Seat } from "@/types/seat.types";
import type { BestAvailableInput } from "@/types/bestAvailable.types";

interface BestAvailableFormProps {
  seats: Seat[];
  fanId: string;
  loading: boolean;
  disabled: boolean;
  onFindSeats: (data: BestAvailableInput) => Promise<void>;
}

export default function BestAvailableForm({
  seats,
  fanId,
  loading,
  disabled,
  onFindSeats,
}: BestAvailableFormProps) {
  const [quantity, setQuantity] = useState<number>(2);
  const [zoneId, setZoneId] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Get unique zones from seats
  const zones = Array.from(
    new Map(
      seats.map((seat) => [
        seat.zone_id,
        {
          id: seat.zone_id,
          name: seat.zone_name,
        },
      ])
    ).values()
  );

  async function handleSubmit() {
    setValidationError(null);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 4) {
      setValidationError("Please select between 1 and 4 tickets.");
      return;
    }

    const input: BestAvailableInput = {
      fan_id: fanId,
      quantity,
    };

    if (zoneId) {
      input.zone_id = zoneId;
    }

    if (maxPrice.trim() !== "") {
      const price = Number(maxPrice);

      if (!Number.isFinite(price) || price < 0) {
        setValidationError("Please enter a valid maximum price.");
        return;
      }

      const priceAgorot = Math.round(price * 100);

      if (!Number.isSafeInteger(priceAgorot)) {
        setValidationError("Maximum price is too large.");
        return;
      }

      input.max_price_agorot = priceAgorot;
    }

    await onFindSeats(input);
  }

  function handleZoneChange(event: SelectChangeEvent<string>) {
    setZoneId(event.target.value);
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center" }}
        >
          <AutoAwesome color="primary" />

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Best Available Seats
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Automatically find adjacent seats.
            </Typography>
          </Box>
        </Stack>

        {/* Quantity */}
        <FormControl fullWidth>
          <InputLabel id="best-available-quantity-label">
            Number of Tickets
          </InputLabel>

          <Select
            labelId="best-available-quantity-label"
            value={String(quantity)}
            label="Number of Tickets"
            disabled={disabled || loading}
            onChange={(event) => setQuantity(Number(event.target.value))}
          >
            {[1, 2, 3, 4].map((value) => (
              <MenuItem key={value} value={String(value)}>
                {value} {value === 1 ? "Ticket" : "Tickets"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Zone */}
        <FormControl fullWidth>
          <InputLabel id="best-available-zone-label">
            Seating Zone
          </InputLabel>

          <Select
            labelId="best-available-zone-label"
            value={zoneId}
            label="Seating Zone"
            onChange={handleZoneChange}
            disabled={disabled || loading}
          >
            <MenuItem value="">
              Any Zone
            </MenuItem>

            {zones.map((zone) => (
              <MenuItem key={zone.id} value={zone.id}>
                {zone.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Maximum price */}
        <TextField
          fullWidth
          label="Maximum Price per Ticket (₪)"
          type="number"
          value={maxPrice}
          disabled={disabled || loading}
          onChange={(event) => setMaxPrice(event.target.value)}
          slotProps={{
            htmlInput: {
              min: 0,
              step: 1,
            },
          }}
          helperText="Optional. Leave empty for no price limit."
        />

        {/* Validation error */}
        {validationError && (
          <Alert severity="error">
            {validationError}
          </Alert>
        )}

        {/* Submit */}
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={disabled || loading}
          onClick={handleSubmit}
          startIcon={
            loading
              ? <CircularProgress size={18} color="inherit" />
              : <AutoAwesome />
          }
        >
          {loading ? "Finding Seats..." : "Find Best Available"}
        </Button>
      </Stack>
    </Paper>
  );
}
