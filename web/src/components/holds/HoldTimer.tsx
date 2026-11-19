import { useEffect, useState } from "react";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { AccessTime } from "@mui/icons-material";

interface HoldTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

const HOLD_DURATION_SECONDS = 300;

export default function HoldTimer({
  expiresAt,
  onExpire,
}: HoldTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(
      0,
      Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
    )
  );

  useEffect(() => {
    function updateTimer() {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );

      setRemainingSeconds(remaining);
    }

    updateTimer();

    const interval = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (remainingSeconds === 0) {
      onExpire?.();
    }
  }, [remainingSeconds, onExpire]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progress = Math.min(
    100,
    (remainingSeconds / HOLD_DURATION_SECONDS) * 100
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", mb: 2 }}
      >
        <AccessTime color="primary" />

        <Typography variant="h6">
          Time Remaining: {formattedTime}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progress}
        color={remainingSeconds <= 60 ? "error" : "primary"}
        sx={{ height: 10, borderRadius: 5 }}
      />

      {remainingSeconds === 0 && (
        <Typography color="error" sx={{ mt: 1 }}>
          Your hold has expired.
        </Typography>
      )}
    </Box>
  );
}
