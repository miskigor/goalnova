import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";

export type ChallengeWinnerRow = {
  id: string;
  challenge_id: string;
  video_id: string;
  rank: number;
  placement_source: string;
};

function isMissingChallengeWinnersTableError(error: unknown): boolean {
  const e = error as { code?: string | null; message?: string | null } | null;
  if (e?.code !== "PGRST205") return false;
  const msg = String(e?.message ?? "").toLowerCase();
  return msg.includes("challenge_winners");
}

/**
 * Replace all manual podium rows for a challenge (ranks 1–3 from ordered video ids).
 * Empty array clears manual overrides (computed podium can show for ended challenges).
 */
export async function replaceManualChallengeWinners(params: {
  challengeId: string;
  orderedVideoIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cid = params.challengeId.trim();
  if (!cid) return { ok: false, error: "invalid_challenge" };

  const ids = params.orderedVideoIds.map((x) => x.trim()).filter(Boolean);
  const unique: string[] = [];
  for (const id of ids) {
    if (!unique.includes(id)) unique.push(id);
  }
  const top = unique.slice(0, 3);

  const { error: delErr } = await supabase
    .from("challenge_winners")
    .delete()
    .eq("challenge_id", cid)
    .eq("placement_source", "manual");

  if (delErr) {
    if (isMissingChallengeWinnersTableError(delErr)) {
      return { ok: true };
    }
    logFullSupabaseError("[challenge_winners] delete manual", delErr, { cid });
    return { ok: false, error: supabaseErrorToUserMessage(delErr) };
  }

  if (top.length === 0) {
    return { ok: true };
  }

  const rows = top.map((video_id, i) => ({
    challenge_id: cid,
    video_id,
    rank: i + 1,
    placement_source: "manual" as const,
  }));

  const { error: insErr } = await supabase.from("challenge_winners").insert(rows);
  if (insErr) {
    if (isMissingChallengeWinnersTableError(insErr)) {
      return { ok: true };
    }
    logFullSupabaseError("[challenge_winners] insert manual", insErr, { cid });
    return { ok: false, error: supabaseErrorToUserMessage(insErr) };
  }

  return { ok: true };
}

export async function fetchManualWinnerRows(
  challengeId: string,
): Promise<{ rows: ChallengeWinnerRow[]; error: string | null }> {
  const cid = challengeId.trim();
  if (!cid) return { rows: [], error: null };

  const { data, error } = await supabase
    .from("challenge_winners")
    .select("id, challenge_id, video_id, rank, placement_source")
    .eq("challenge_id", cid)
    .eq("placement_source", "manual")
    .order("rank", { ascending: true });

  if (error) {
    if (isMissingChallengeWinnersTableError(error)) {
      return { rows: [], error: null };
    }
    logFullSupabaseError("[challenge_winners] fetch manual", error, { cid });
    return { rows: [], error: supabaseErrorToUserMessage(error) };
  }

  const rows = (data ?? []) as ChallengeWinnerRow[];
  return { rows, error: null };
}
