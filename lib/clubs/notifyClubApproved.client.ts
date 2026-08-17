import { supabase } from "@/lib/supabase/client";
import { currentUiLocale } from "@/lib/i18n/currentUiLocale";

/** Notify club contact person after admin approves partnership (invite code email). */
export async function notifyClubApproved(clubId: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await fetch("/api/clubs/notify-club-approved", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clubId, locale: currentUiLocale() }),
    });
  } catch {
    /* non-blocking */
  }
}
