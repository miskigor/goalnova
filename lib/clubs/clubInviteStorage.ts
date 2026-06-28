const STORAGE_KEY = "pitchrusch_pending_club_invite_code";

export function rememberClubInviteCode(code: string | null | undefined): void {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function peekPendingClubInviteCode(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingClubInviteCode(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function tryConsumePendingClubInviteWhenPlayerReady(): Promise<void> {
  const code = peekPendingClubInviteCode();
  if (!code) return;

  const { supabase } = await import("@/lib/supabase/client");
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) return;

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.session.user.id)
    .maybeSingle();

  if (userRow?.role !== "player") return;

  const { rpcClubJoin } = await import("@/lib/supabase/clubs");
  const { notifyClubPlayerJoin } = await import("@/lib/clubs/notifyClubPlayerJoin.client");
  const result = await rpcClubJoin({ clubCode: code });
  if (result.ok) {
    clearPendingClubInviteCode();
    if (result.clubId) {
      void notifyClubPlayerJoin({
        clubId: result.clubId,
        membershipId: result.membershipId,
      });
    }
  }
}
