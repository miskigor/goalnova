import { supabase } from "@/lib/supabase/client";

/** Fire-and-forget email to the club contact when a player requests membership. */
export async function notifyClubPlayerJoin(options: {
  clubId: string;
  membershipId?: string;
}): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await fetch("/api/clubs/notify-player-join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        clubId: options.clubId,
        membershipId: options.membershipId,
      }),
    });
  } catch {
    /* non-blocking */
  }
}
