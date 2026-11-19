import { createContext } from "react";
import type { Fan } from "@/types/fan.types";

export interface FanContextType {
  fan: Fan | null;
  isLoggedIn: boolean;
  login: (fan: Fan) => void;
  logout: () => void;
}

export const FanContext = createContext<FanContextType | undefined>(
  undefined
);
