"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ActiveSessionBar } from "./ActiveSessionBar";
import { DebugPanel } from "./DebugPanel";
import { Notice } from "./Notice";
import { useSession } from "./SessionProvider";
import { COPY } from "@/lib/copy";

type SessionShellProps = {
  children: ReactNode;
};

export function SessionShell({ children }: SessionShellProps) {
  const { state, isActive, isDemoMode } = useSession();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <>
      <ActiveSessionBar
        active={isActive || state.status === "complete"}
        paused={state.status === "paused"}
        taskTitle={state.taskTitle}
      />
      <div
        className={`mx-auto max-w-lg px-4 py-6 ${isDemoMode ? "pb-[calc(40vh+1rem)]" : ""}`}
      >
        {offline && (
          <div className="mb-4">
            <Notice variant="offline" role="status">
              {COPY.network.offline}
            </Notice>
          </div>
        )}
        {children}
      </div>
      <DebugPanel events={state.debugEvents} visible={isDemoMode} />
    </>
  );
}
