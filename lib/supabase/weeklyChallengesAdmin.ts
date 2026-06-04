import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";
import type {
  WeeklyChallengeFormInput,
  WeeklyChallengeInsert,
  WeeklyChallengeRow,
  WeeklyChallengeUpdate,
} from "@/lib/supabase/weeklyChallenges.types";

function isMissingTableError(error: unknown): boolean {
  const e = error as { code?: string | null } | null;
  return e?.code === "PGRST205";
}

function trimOrNull(s: string): string | null {
  const t = s.trim();
  return t.length > 0 ? t : null;
}

export function weeklyChallengeFormToInsert(
  input: WeeklyChallengeFormInput,
): WeeklyChallengeInsert {
  return {
    title: input.title.trim(),
    description: trimOrNull(input.description),
    rules: trimOrNull(input.rules),
    equipment: trimOrNull(input.equipment),
    reward_xp: Math.max(0, Math.floor(input.rewardXp)),
    badge_name: trimOrNull(input.badgeName),
    max_video_duration_seconds: input.maxVideoDurationSeconds,
    free_attempts: Math.max(0, Math.floor(input.freeAttempts)),
    premium_attempts: Math.max(0, Math.floor(input.premiumAttempts)),
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    is_active: input.isActive,
    is_public: input.isPublic,
  };
}

export function weeklyChallengeFormToUpdate(
  input: WeeklyChallengeFormInput,
): WeeklyChallengeUpdate {
  return weeklyChallengeFormToInsert(input);
}

export function weeklyChallengeRowToForm(row: WeeklyChallengeRow): WeeklyChallengeFormInput {
  return {
    title: row.title,
    description: row.description ?? "",
    rules: row.rules ?? "",
    equipment: row.equipment ?? "",
    rewardXp: row.reward_xp,
    badgeName: row.badge_name ?? "",
    maxVideoDurationSeconds: row.max_video_duration_seconds,
    freeAttempts: row.free_attempts,
    premiumAttempts: row.premium_attempts,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    isPublic: row.is_public,
  };
}

export async function fetchWeeklyChallengesAdminList(): Promise<{
  rows: WeeklyChallengeRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("weekly_challenges")
    .select("*")
    .order("starts_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return {
        rows: [],
        error:
          "Weekly challenges tables are not deployed yet. Run the latest Supabase migrations.",
      };
    }
    logFullSupabaseError("[weeklyChallengesAdmin] list", error);
    return { rows: [], error: supabaseErrorToUserMessage(error) };
  }

  return { rows: (data ?? []) as WeeklyChallengeRow[], error: null };
}

export async function fetchWeeklyChallengeById(id: string): Promise<{
  row: WeeklyChallengeRow | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("weekly_challenges")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[weeklyChallengesAdmin] fetchById", error);
    return { row: null, error: supabaseErrorToUserMessage(error) };
  }

  return { row: (data as WeeklyChallengeRow | null) ?? null, error: null };
}

export async function createWeeklyChallenge(
  input: WeeklyChallengeFormInput,
): Promise<{ row: WeeklyChallengeRow | null; error: string | null }> {
  const payload = weeklyChallengeFormToInsert(input);
  const { data, error } = await supabase
    .from("weekly_challenges")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    logFullSupabaseError("[weeklyChallengesAdmin] create", error);
    return { row: null, error: supabaseErrorToUserMessage(error) };
  }

  return { row: data as WeeklyChallengeRow, error: null };
}

export async function updateWeeklyChallenge(
  id: string,
  input: WeeklyChallengeFormInput,
): Promise<{ row: WeeklyChallengeRow | null; error: string | null }> {
  const payload = weeklyChallengeFormToUpdate(input);
  const { data, error } = await supabase
    .from("weekly_challenges")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logFullSupabaseError("[weeklyChallengesAdmin] update", error);
    return { row: null, error: supabaseErrorToUserMessage(error) };
  }

  return { row: data as WeeklyChallengeRow, error: null };
}

export async function fetchWeeklyChallengeSubmissionCount(
  challengeId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("weekly_challenge_submissions")
    .select("id", { count: "exact", head: true })
    .eq("weekly_challenge_id", challengeId);

  if (error) {
    logFullSupabaseError("[weeklyChallengesAdmin] submission count", error);
    return 0;
  }

  return count ?? 0;
}
