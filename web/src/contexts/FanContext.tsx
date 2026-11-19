import { useState } from "react";
import type { ReactNode } from "react";
import type { Fan } from "@/types/fan.types";
import { FanContext } from "@/contexts/fan.context";

const STORAGE_KEY = "seatrush_current_fan";

interface FanProviderProps {
  children: ReactNode;
}

function loadSavedFan(): Fan | null {
  try {
    const savedFan = sessionStorage.getItem(STORAGE_KEY);

    if (!savedFan) return null;

    const parsed: unknown = JSON.parse(savedFan);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("id" in parsed) ||
      !("username" in parsed) ||
      !("created_at" in parsed) ||
      typeof parsed.id !== "string" ||
      typeof parsed.username !== "string" ||
      typeof parsed.created_at !== "string"
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      id: parsed.id,
      username: parsed.username,
      created_at: parsed.created_at,
    };
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function FanProvider({ children }: FanProviderProps) {
  const [fan, setFan] = useState<Fan | null>(loadSavedFan);

  function login(newFan: Fan) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newFan));
    setFan(newFan);
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setFan(null);
  }

  return (
    <FanContext.Provider
      value={{
        fan,
        isLoggedIn: fan !== null,
        login,
        logout,
      }}
    >
      {children}
    </FanContext.Provider>
  );
}
