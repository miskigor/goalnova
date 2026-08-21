import { supabase } from "@/lib/supabase/client";
import { PITCHRUSCH_PREMIUM_UPDATED_EVENT } from "@/lib/supabase/premium";

async function authBearerToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function dispatchPremiumUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PITCHRUSCH_PREMIUM_UPDATED_EVENT));
}

export async function syncOwnClubMemberPremium(): Promise<{
  ok: boolean;
  granted?: boolean;
  revoked?: boolean;
}> {
  const token = await authBearerToken();
  if (!token) return { ok: false };
  try {
    const res = await fetch("/api/clubs/sync-member-premium", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      granted?: boolean;
      revoked?: boolean;
    };
    if (payload.ok && (payload.granted || payload.revoked)) {
      dispatchPremiumUpdated();
    }
    return {
      ok: Boolean(payload.ok),
      granted: Boolean(payload.granted),
      revoked: Boolean(payload.revoked),
    };
  } catch {
    return { ok: false };
  }
}

export async function syncClubMembersPremium(clubId: string): Promise<{ ok: boolean }> {
  const token = await authBearerToken();
  if (!token || !clubId.trim()) return { ok: false };
  try {
    const res = await fetch("/api/clubs/sync-member-premium", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clubId: clubId.trim() }),
      signal: AbortSignal.timeout(8000),
    });
    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return { ok: Boolean(payload.ok) };
  } catch {
    return { ok: false };
  }
}
