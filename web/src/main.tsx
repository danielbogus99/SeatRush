import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "@/App";
import { FanProvider } from "@/contexts/FanContext";

const theme = createTheme({
  palette: {
    mode: "dark",
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FanProvider>
        <App />
      </FanProvider>
    </ThemeProvider>
  </React.StrictMode>
);
