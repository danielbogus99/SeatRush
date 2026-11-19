import { useContext } from "react";
import { FanContext } from "@/contexts/fan.context";

export function useFan() {
  const context = useContext(FanContext);

  if (!context) {
    throw new Error("useFan must be used inside FanProvider");
  }

  return context;
}