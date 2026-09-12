/**
 * In-memory session store. Enough for the demo; swap for SQLite/Postgres only if time allows
 * (build-day runbook: persistent DB is cut #4).
 */
import { randomUUID } from "node:crypto";
import type { Session } from "../contracts/domain";

const sessions = new Map<string, Session>();

export function createSession(userId: string, mode: Session["mode"] = "stay_with_me"): Session {
  const session: Session = {
    session_id: `s_${randomUUID().slice(0, 8)}`,
    user_id: userId,
    mode,
    status: "active",
    state: "START",
    started_at: new Date().toISOString(),
    task: null,
    observations: [],
    turns: [],
    pending_action: null,
    hold: null,
    interjection: null,
    follow_ups: [],
    receipts: [],
    executed_action_ids: [],
  };
  sessions.set(session.session_id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function saveSession(session: Session): void {
  sessions.set(session.session_id, session);
}

export function endSession(id: string): void {
  const s = sessions.get(id);
  if (!s) return;
  s.status = "ended";
  // Privacy test: ending session stops capture and drops what was captured.
  s.observations = [];
  s.turns = [];
  s.pending_action = null;
  sessions.set(id, s);
}

export function resetStore(): void {
  sessions.clear();
}
