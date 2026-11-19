
import { useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from "@mui/material";
import type { Event } from "@/types/event.types";
import type { CreateEventInput, CreateZoneInput } from "@/api/adminEvent.api";
import { createEvent } from "@/api/adminEvent.api";

interface CreateEventDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (event: Event) => void;
}

interface ZoneForm {
  id: number;
  name: string;
  price: string;
  startRow: string;
  endRow: string;
}

function getRowLabel(index: number): string {
  let number = index + 1;
  let label = "";

  while (number > 0) {
    number--;
    label = String.fromCharCode(65 + (number % 26)) + label;
    number = Math.floor(number / 26);
  }

  return label;
}

function createEmptyZone(id: number): ZoneForm {
  return {
    id,
    name: "",
    price: "",
    startRow: "",
    endRow: "",
  };
}

export default function CreateEventDialog({
  open,
  onClose,
  onCreated,
}: CreateEventDialogProps) {
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [onSaleAt, setOnSaleAt] = useState("");

  const [rowCount, setRowCount] = useState("10");
  const [seatsPerRow, setSeatsPerRow] = useState("10");

  const [zones, setZones] = useState<ZoneForm[]>([
    {
      id: 1,
      name: "Regular",
      price: "",
      startRow: "A",
      endRow: "J",
    },
  ]);

  const [nextZoneId, setNextZoneId] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedRowCount = Number(rowCount);
  const parsedSeatsPerRow = Number(seatsPerRow);

  const validRowCount =
    Number.isInteger(parsedRowCount) && parsedRowCount > 0;

  const rowOptions = validRowCount && parsedRowCount <= 500
    ? Array.from(
        { length: parsedRowCount },
        (_, index) => getRowLabel(index)
      )
    : [];

  function resetForm() {
    setName("");
    setVenue("");
    setStartsAt("");
    setOnSaleAt("");
    setRowCount("10");
    setSeatsPerRow("10");

    setZones([
      {
        id: 1,
        name: "Regular",
        price: "",
        startRow: "A",
        endRow: "J",
      },
    ]);

    setNextZoneId(2);
    setError(null);
  }

  function handleClose() {
    if (loading) return;

    resetForm();
    onClose();
  }

  function addZone() {
    setZones((previous) => [
      ...previous,
      createEmptyZone(nextZoneId),
    ]);

    setNextZoneId((previous) => previous + 1);
  }

  function removeZone(id: number) {
    setZones((previous) =>
      previous.filter((zone) => zone.id !== id)
    );
  }

  function updateZone(
    id: number,
    field: keyof Omit<ZoneForm, "id">,
    value: string
  ) {
    setZones((previous) =>
      previous.map((zone) =>
        zone.id === id
          ? { ...zone, [field]: value }
          : zone
      )
    );
  }

  async function handleSubmit() {
    if (loading) return;

    setError(null);

    if (!name.trim() || !venue.trim()) {
      setError("Event name and venue are required.");
      return;
    }

    if (!startsAt || !onSaleAt) {
      setError("Please select both dates.");
      return;
    }

    const eventDate = new Date(startsAt);
    const saleDate = new Date(onSaleAt);

    if (
      !Number.isFinite(eventDate.getTime()) ||
      !Number.isFinite(saleDate.getTime())
    ) {
      setError("Please enter valid dates.");
      return;
    }

    if (saleDate >= eventDate) {
      setError("Ticket sales must begin before the event.");
      return;
    }

    if (
      !rowCount.trim() ||
      !seatsPerRow.trim() ||
      !validRowCount ||
      !Number.isInteger(parsedSeatsPerRow) ||
      parsedSeatsPerRow <= 0
    ) {
      setError("Rows and seats per row must be positive integers.");
      return;
    }

    if (parsedRowCount > 500) {
      setError("This form supports up to 500 rows.");
      return;
    }

    if (zones.length === 0) {
      setError("At least one pricing zone is required.");
      return;
    }

    const parsedZones: CreateZoneInput[] = [];
    const zoneNames = new Set<string>();
    const coveredRows = new Set<string>();

    for (const zone of zones) {
      const zoneName = zone.name.trim();
      const price = Number(zone.price);

      if (!zoneName) {
        setError("Every zone needs a name.");
        return;
      }

      if (zoneNames.has(zoneName.toLowerCase())) {
        setError("Zone names must be unique.");
        return;
      }

      zoneNames.add(zoneName.toLowerCase());

      if (
        !zone.price.trim() ||
        !Number.isFinite(price) ||
        price < 0 ||
        Math.abs(price * 100 - Math.round(price * 100)) > 0.000001
      ) {
        setError("Enter a valid price with up to 2 decimal places.");
        return;
      }

      const startRow = zone.startRow.trim().toUpperCase();
      const endRow = zone.endRow.trim().toUpperCase();

      const startIndex = rowOptions.indexOf(startRow);
      const endIndex = rowOptions.indexOf(endRow);

      if (startIndex < 0 || endIndex < startIndex) {
        setError(
          `Invalid row range for zone "${zoneName}".`
        );
        return;
      }

      for (let index = startIndex; index <= endIndex; index++) {
        const rowLabel = rowOptions[index];

        if (coveredRows.has(rowLabel)) {
          setError(`Row ${rowLabel} belongs to more than one zone.`);
          return;
        }

        coveredRows.add(rowLabel);
      }

      parsedZones.push({
        name: zoneName,
        price_agorot: Math.round(price * 100),
        start_row: startRow,
        end_row: endRow,
      });
    }

    if (coveredRows.size !== parsedRowCount) {
      const missingRows = rowOptions.filter(
        (row) => !coveredRows.has(row)
      );

      setError(
        `All rows must belong to a zone. Missing: ${missingRows.join(", ")}`
      );
      return;
    }

    const input: CreateEventInput = {
      name: name.trim(),
      venue: venue.trim(),
      starts_at: eventDate.toISOString(),
      on_sale_at: saleDate.toISOString(),
      row_count: parsedRowCount,
      seats_per_row: parsedSeatsPerRow,
      zones: parsedZones,
    };

    setLoading(true);

    try {
      const event = await createEvent(input);

      onCreated(event);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create event"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Create New Event
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Event Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Summer Music Festival"
            fullWidth
            required
            disabled={loading}
          />

          <TextField
            label="Venue"
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            placeholder="Tel Aviv Arena"
            fullWidth
            required
            disabled={loading}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
              },
              gap: 2,
            }}
          >
            <TextField
              label="Event Date & Time"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
              required
              disabled={loading}
            />

            <TextField
              label="Ticket Sale Date & Time"
              type="datetime-local"
              value={onSaleAt}
              onChange={(event) => setOnSaleAt(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
              required
              disabled={loading}
            />
          </Box>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Event Seating Layout
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label="Number of Rows"
                  type="number"
                  value={rowCount}
                  onChange={(event) => setRowCount(event.target.value)}
                  slotProps={{
                    htmlInput: { min: 1, max: 500, step: 1 },
                  }}
                  required
                  disabled={loading}
                />

                <TextField
                  label="Seats Per Row"
                  type="number"
                  value={seatsPerRow}
                  onChange={(event) => setSeatsPerRow(event.target.value)}
                  slotProps={{
                    htmlInput: { min: 1, step: 1 },
                  }}
                  required
                  disabled={loading}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Total Event Capacity:{" "}
                {validRowCount &&
                Number.isInteger(parsedSeatsPerRow) &&
                parsedSeatsPerRow > 0
                  ? parsedRowCount * parsedSeatsPerRow
                  : 0}{" "}
                seats
              </Typography>
            </Stack>
          </Paper>

          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Pricing Zones
            </Typography>

            <Button
              variant="outlined"
              onClick={addZone}
              disabled={loading}
            >
              + Add Zone
            </Button>
          </Stack>

          {zones.map((zone, index) => (
            <Paper
              key={zone.id}
              variant="outlined"
              sx={{ p: 3, borderRadius: 3 }}
            >
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    Zone {index + 1}
                  </Typography>

                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    onClick={() => removeZone(zone.id)}
                    disabled={loading || zones.length === 1}
                  >
                    Remove Zone
                  </Button>
                </Stack>

                <TextField
                  label="Zone Name"
                  placeholder="VIP / Regular / Balcony"
                  value={zone.name}
                  onChange={(event) =>
                    updateZone(zone.id, "name", event.target.value)
                  }
                  fullWidth
                  required
                  disabled={loading}
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(3, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Price (₪)"
                    type="number"
                    value={zone.price}
                    onChange={(event) =>
                      updateZone(zone.id, "price", event.target.value)
                    }
                    slotProps={{
                      htmlInput: { min: 0, step: 0.01 },
                    }}
                    required
                    disabled={loading}
                  />

                  <TextField
                    label="Start Row"
                    value={zone.startRow}
                    onChange={(event) =>
                      updateZone(zone.id, "startRow", event.target.value)
                    }
                    placeholder="A"
                    helperText="First row in this zone"
                    required
                    disabled={loading}
                  />

                  <TextField
                    label="End Row"
                    value={zone.endRow}
                    onChange={(event) =>
                      updateZone(zone.id, "endRow", event.target.value)
                    }
                    placeholder="E"
                    helperText="Last row in this zone"
                    required
                    disabled={loading}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Zone Capacity:{" "}
                  {(() => {
                    const startIndex = rowOptions.indexOf(
                      zone.startRow.trim().toUpperCase()
                    );
                    const endIndex = rowOptions.indexOf(
                      zone.endRow.trim().toUpperCase()
                    );

                    return startIndex >= 0 && endIndex >= startIndex
                      ? (endIndex - startIndex + 1) *
                          (Number.isInteger(parsedSeatsPerRow)
                            ? Math.max(0, parsedSeatsPerRow)
                            : 0)
                      : 0;
                  })()}{" "}
                  seats
                </Typography>
              </Stack>
            </Paper>
          ))}

          <Alert severity="info">
            Every row must belong to exactly one pricing zone.
            For example, with 10 rows: VIP A-E and Regular F-J.
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={18} color="inherit" />
            ) : undefined
          }
        >
          {loading ? "Creating..." : "Create Event"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
