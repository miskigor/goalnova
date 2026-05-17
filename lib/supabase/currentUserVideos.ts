import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

/** `true` if the signed-in user has at least one row in `videos`; `null` if unknown / signed out. */
export async function currentUserHasAnyVideo(): Promise<boolean | null> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    logFullSupabaseError("[currentUserVideos] getSession", sessionErr);
    return null;
  }
  const uid = sessionData.session?.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from("videos")
    .select("id")
    .eq("user_id", uid)
    .limit(1)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[currentUserVideos] select id", error, { userId: uid });
    return null;
  }

  return Boolean(data?.id);
}
