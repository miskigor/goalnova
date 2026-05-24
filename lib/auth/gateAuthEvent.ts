import { invalidateGateSessionSnapshot } from "@/lib/auth/gateSessionSnapshot";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export type GateAuthEventContext = {
  allowed: boolean;
  trackedUserId: string | null;
};

export type GateAuthEventAction = "skip" | "reevaluate-block" | "reevaluate-background";

const BENIGN_DUPLICATE_EVENTS = new Set<AuthChangeEvent>([
  "INITIAL_SESSION",
  "TOKEN_REFRESHED",
]);

/**
 * Whether an auth listener should re-run gate logic and whether AppShell may be unmounted.
 */
export function resolveGateAuthEventAction(
  event: AuthChangeEvent,
  session: Session | null,
  ctx: GateAuthEventContext,
): GateAuthEventAction {
  const userId = session?.user?.id ?? null;

  if (event === "SIGNED_OUT" || !userId) {
    invalidateGateSessionSnapshot();
    return "reevaluate-block";
  }

  if (ctx.trackedUserId !== null && ctx.trackedUserId !== userId) {
    invalidateGateSessionSnapshot();
    return "reevaluate-block";
  }

  if (BENIGN_DUPLICATE_EVENTS.has(event)) {
    if (ctx.allowed) {
      return "skip";
    }
    // First pass still on spinner — `useEffect` evaluate already in flight.
    return "skip";
  }

  if (!ctx.allowed) {
    return "reevaluate-block";
  }

  return "reevaluate-background";
}
