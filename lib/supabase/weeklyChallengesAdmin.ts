import {
  fallbackBaseColumnsFromTranslations,
  weeklyChallengeFormToDbPayload,
  weeklyChallengeRowToForm,
} from "@/lib/weeklyChallenges/weeklyChallengeTranslations";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";
import type {
  WeeklyChallengeFormInput,
  WeeklyChallengeRow,
} from "@/lib/supabase/weeklyChallenges.types";

function isMissingTableError(error: unknown): boolean {
  const e = error as { code?: string | null } | null;
  return e?.code === "PGRST205";
}

export {
  listDisplayTitle,
  localeHasOwnTranslation,
  resolveWeeklyChallengeLocaleContent,
  weeklyChallengeRowToForm,
} from "@/lib/weeklyChallenges/weeklyChallengeTranslations";

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
  const base = fallbackBaseColumnsFromTranslations(input.translations);
  if (!base.title) {
    return { row: null, error: "English (en) title is required as the fallback." };
  }

  const payload = weeklyChallengeFormToDbPayload(input);
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
  const base = fallbackBaseColumnsFromTranslations(input.translations);
  if (!base.title) {
    return { row: null, error: "English (en) title is required as the fallback." };
  }

  const payload = weeklyChallengeFormToDbPayload(input);
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
