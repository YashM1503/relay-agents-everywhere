"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSessionFlow, type SessionFlow } from "./useSessionFlow";

const SessionContext = createContext<SessionFlow | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const flow = useSessionFlow();
  return (
    <SessionContext.Provider value={flow}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionFlow {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
