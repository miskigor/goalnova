import { isEmailConfirmed } from "@/lib/auth/emailConfirmed";
import type { GateSessionSnapshot } from "@/lib/auth/gateSessionSnapshot";
import type { Session } from "@supabase/supabase-js";

export type AuthSnapshotState = {
  session: Session | null;
  isAuthenticated: boolean;
  emailConfirmed: boolean | null;
};

/** Map a gate session snapshot into AuthGate state fields. */
export function applyGateSessionSnapshot(
  snapshot: GateSessionSnapshot,
): AuthSnapshotState {
  const user = snapshot.user ?? snapshot.session?.user ?? null;
  const isAuthenticated = Boolean(
    snapshot.session?.access_token ?? snapshot.session ?? user?.id,
  );
  return {
    session: snapshot.session,
    isAuthenticated,
    emailConfirmed:
      isAuthenticated && user ? isEmailConfirmed(user) : null,
  };
}
