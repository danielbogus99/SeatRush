import { useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import type { Fan } from "@/types/fan.types";
import { loginFan } from "@/api/fan.api";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: (fan: Fan) => void;
}

export default function LoginDialog({
  open,
  onClose,
  onLoginSuccess,
}: LoginDialogProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      setError("Please enter a username.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fan = await loginFan({
        username: normalizedUsername,
      });

      setUsername("");
      onLoginSuccess(fan);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;

    setUsername("");
    setError(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1,
          },
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleLogin}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Welcome to SeatRush
        </DialogTitle>

        <DialogContent>
          <Typography
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Enter your username to reserve seats and manage your tickets.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            fullWidth
            autoFocus
            disabled={loading}
            slotProps={{
              htmlInput: {
                maxLength: 100,
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            color="inherit"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={loading || !username.trim()}
            startIcon={
              loading
                ? <CircularProgress size={18} color="inherit" />
                : <LoginOutlined />
            }
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
