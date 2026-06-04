import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";
import type {
  WeeklyChallengeSubmissionInsert,
  WeeklyChallengeSubmissionQuota,
  WeeklyChallengeSubmissionRow,
  WeeklyChallengeSubmissionStatus,
  WeeklyChallengeSubmissionUpdate,
} from "@/lib/supabase/weeklyChallengeSubmissions.types";
import {
  WEEKLY_CHALLENGE_FREE_SUBMISSION_LIMIT,
  WEEKLY_CHALLENGE_PREMIUM_SUBMISSION_LIMIT,
} from "@/lib/supabase/weeklyChallengeSubmissions.types";

function isMissingTableError(error: unknown): boolean {
  const e = error as { code?: string | null } | null;
  return e?.code === "PGRST205";
}

function isSubmissionLimitError(error: unknown): boolean {
  const e = error as { message?: string; code?: string } | null;
  const msg = (e?.message ?? "").toLowerCase();
  return msg.includes("submission limit reached") || e?.code === "P0001";
}

export function weeklyChallengeSubmissionLimitForPremium(isPremium: boolean): number {
  return isPremium
    ? WEEKLY_CHALLENGE_PREMIUM_SUBMISSION_LIMIT
    : WEEKLY_CHALLENGE_FREE_SUBMISSION_LIMIT;
}

export async function fetchPlayerIsPremium(playerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("is_premium")
    .eq("id", playerId)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[weeklyChallengeSubmissions] isPremium", error);
    return false;
  }

  return !!data?.is_premium;
}

export async function fetchCurrentUserIsPremium(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return fetchPlayerIsPremium(user.id);
}

export async function countWeeklyChallengeSubmissionsForPlayer(
  challengeId: string,
  playerId: string,
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await supabase
    .from("weekly_challenge_submissions")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId)
    .eq("player_id", playerId);

  if (error) {
    if (isMissingTableError(error)) {
      return { count: 0, error: "Weekly challenge submissions are not deployed yet." };
    }
    logFullSupabaseError("[weeklyChallengeSubmissions] count", error);
    return { count: 0, error: supabaseErrorToUserMessage(error) };
  }

  return { count: count ?? 0, error: null };
}

export async function fetchWeeklyChallengeSubmissionQuota(
  challengeId: string,
  playerId: string,
): Promise<{ quota: WeeklyChallengeSubmissionQuota | null; error: string | null }> {
  const isPremium = await fetchPlayerIsPremium(playerId);

  const { count, error: countError } = await countWeeklyChallengeSubmissionsForPlayer(
    challengeId,
    playerId,
  );
  if (countError) {
    return { quota: null, error: countError };
  }

  const limit = weeklyChallengeSubmissionLimitForPremium(isPremium);
  const used = count;
  return {
    quota: {
      limit,
      used,
      remaining: Math.max(0, limit - used),
      isPremium,
    },
    error: null,
  };
}

export async function fetchPlayerWeeklyChallengeSubmissions(
  challengeId: string,
  playerId: string,
): Promise<{ rows: WeeklyChallengeSubmissionRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("weekly_challenge_submissions")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return { rows: [], error: "Weekly challenge submissions are not deployed yet." };
    }
    logFullSupabaseError("[weeklyChallengeSubmissions] listForPlayer", error);
    return { rows: [], error: supabaseErrorToUserMessage(error) };
  }

  return { rows: (data ?? []) as WeeklyChallengeSubmissionRow[], error: null };
}

/** Admin / future tooling — lists all submissions for a challenge. */
export async function fetchWeeklyChallengeSubmissionsByChallenge(
  challengeId: string,
): Promise<{ rows: WeeklyChallengeSubmissionRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("weekly_challenge_submissions")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return { rows: [], error: "Weekly challenge submissions are not deployed yet." };
    }
    logFullSupabaseError("[weeklyChallengeSubmissions] listByChallenge", error);
    return { rows: [], error: supabaseErrorToUserMessage(error) };
  }

  return { rows: (data ?? []) as WeeklyChallengeSubmissionRow[], error: null };
}

export async function fetchWeeklyChallengeSubmissionById(
  submissionId: string,
): Promise<{ row: WeeklyChallengeSubmissionRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("weekly_challenge_submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[weeklyChallengeSubmissions] fetchById", error);
    return { row: null, error: supabaseErrorToUserMessage(error) };
  }

  return { row: (data as WeeklyChallengeSubmissionRow | null) ?? null, error: null };
}

export type CreateWeeklyChallengeSubmissionInput = {
  challengeId: string;
  playerId: string;
  videoId?: string | null;
  status?: WeeklyChallengeSubmissionStatus;
};

/** Foundation insert — enforces DB limit trigger (1 free / 3 premium per challenge). */
export async function createWeeklyChallengeSubmission(
  input: CreateWeeklyChallengeSubmissionInput,
): Promise<{ row: WeeklyChallengeSubmissionRow | null; error: string | null }> {
  const payload: WeeklyChallengeSubmissionInsert = {
    challenge_id: input.challengeId,
    player_id: input.playerId,
    video_id: input.videoId ?? null,
    status: input.status ?? "pending",
  };

  const { data, error } = await supabase
    .from("weekly_challenge_submissions")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (isSubmissionLimitError(error)) {
      return { row: null, error: "Submission limit reached for this weekly challenge." };
    }
    logFullSupabaseError("[weeklyChallengeSubmissions] create", error);
    return { row: null, error: supabaseErrorToUserMessage(error) };
  }

  return { row: data as WeeklyChallengeSubmissionRow, error: null };
}

export async function updateWeeklyChallengeSubmission(
  submissionId: string,
  patch: WeeklyChallengeSubmissionUpdate,
): Promise<{ row: WeeklyChallengeSubmissionRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("weekly_challenge_submissions")
    .update(patch)
    .eq("id", submissionId)
    .select("*")
    .single();

  if (error) {
    logFullSupabaseError("[weeklyChallengeSubmissions] update", error);
    return { row: null, error: supabaseErrorToUserMessage(error) };
  }

  return { row: data as WeeklyChallengeSubmissionRow, error: null };
}

export async function canPlayerSubmitWeeklyChallenge(
  challengeId: string,
  playerId: string,
): Promise<{ allowed: boolean; quota: WeeklyChallengeSubmissionQuota | null; error: string | null }> {
  const { quota, error } = await fetchWeeklyChallengeSubmissionQuota(challengeId, playerId);
  if (error || !quota) {
    return { allowed: false, quota, error };
  }
  return { allowed: quota.remaining > 0, quota, error: null };
}
