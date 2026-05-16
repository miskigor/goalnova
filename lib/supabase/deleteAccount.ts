import { supabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/supabase/auth";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: "not_authenticated" | "delete_failed" | "network" };

export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionErr || !token) {
    return { ok: false, reason: "not_authenticated" };
  }

  let response: Response;
  try {
    response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    logFullSupabaseError("[deleteAccount] fetch failed", err);
    return { ok: false, reason: "network" };
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    logFullSupabaseError("[deleteAccount] API error", new Error(body?.message ?? response.statusText));
    return { ok: false, reason: "delete_failed" };
  }

  try {
    await signOut();
  } catch {
    /* account already removed */
  }

  return { ok: true };
}
