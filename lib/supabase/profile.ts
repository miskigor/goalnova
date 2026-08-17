import {
  sanitizePlayerProfileStrings,
  sanitizeScoutProfileStrings,
  type PlayerProfileSanitizedPatch,
  type ScoutProfileSanitizedPatch,
} from "@/lib/profileFieldSanitize";
import { isAppRole } from "@/lib/onboarding/roleOnboarding";
import { readAuthUserWithTimeout } from "@/lib/auth/readAuthUserWithTimeout";
import { isDev } from "@/lib/devLog";
import { supabase, type Database } from "./client";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type PlayerProfileRow = Database["public"]["Tables"]["player_profiles"]["Row"];
type ScoutProfileRow = Database["public"]["Tables"]["scout_profiles"]["Row"];

type SupabaseErrorInfo = {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

type Result<T> =
  | { success: true; data: T }
  | { success: false; data: null; error: SupabaseErrorInfo };

/**
 * Old DBs may lack `scout_profiles.bio` until migration
 * `20260506120000_scout_profiles_bio.sql` is applied.
 */
function isScoutProfilesMissingBioColumnError(err: unknown): boolean {
  const e = err as { code?: string | null; message?: string | null };
  if (e?.code !== "PGRST204") return false;
  const m = (e.message ?? "").toLowerCase();
  return m.includes("bio") && m.includes("scout_profiles");
}

function getMissingColumnFromSchemaCacheError(err: unknown, table: string): string | null {
  const e = err as { code?: string | null; message?: string | null };
  if (e?.code !== "PGRST204") return null;
  const message = String(e.message ?? "");
  if (!message.toLowerCase().includes(table.toLowerCase())) return null;
  const m = message.match(/Could not find the '([^']+)' column/i);
  return m?.[1]?.trim() || null;
}

function toSupabaseErrorInfo(err: unknown): SupabaseErrorInfo {
  const e = err as
    | {
        message?: string;
        code?: string | null;
        details?: string | null;
        hint?: string | null;
      }
    | undefined;

  return {
    message: e?.message ? String(e.message) : "Supabase request failed.",
    code: e?.code ?? null,
    details: e?.details ?? null,
    hint: e?.hint ?? null,
  };
}

function logSupabaseError(label: string, err: unknown) {
  const info = toSupabaseErrorInfo(err);
  console.error(
    `${label} | message=${info.message} code=${info.code ?? "null"} details=${info.details ?? "null"} hint=${info.hint ?? "null"}`
  );
  try {
    const rawIsEmpty = JSON.stringify(err) === "{}";
    if (!rawIsEmpty) console.error(label + " (raw)", err);
  } catch {
    console.error(label + " (raw)", err);
  }
}

export type ProfileLoad =
  | {
      role: "player";
      user: UserRow;
      profile: PlayerProfileRow;
    }
  | {
      role: "scout";
      user: UserRow;
      profile: ScoutProfileRow;
    }
  | {
      role: "club";
      user: UserRow;
    };

export async function loadAndEnsureProfile(): Promise<Result<ProfileLoad>> {
  const authUser = await readAuthUserWithTimeout("loadAndEnsureProfile");

  const authUserId = authUser?.id;
  if (!authUserId) {
    return {
      success: false,
      data: null,
      error: {
        message: "You must be logged in to view your profile.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  const userId = authUserId;

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    logSupabaseError("Supabase: users select error (profile)", userError);
    return { success: false, data: null, error: toSupabaseErrorInfo(userError) };
  }

  if (!userRow?.id) {
    return {
      success: false,
      data: null,
      error: {
        message: "Your account profile is missing. Please log out and log in again.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  const role = userRow.role;
  if (role === "club") {
    return { success: true, data: { role: "club", user: userRow as UserRow } };
  }
  if (!isAppRole(role)) {
    return {
      success: false,
      data: null,
      error: {
        message: "Choose Player or Scout to finish setting up your account.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  if (role === "player") {
    const { data: profile, error: selectError } = await supabase
      .from("player_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (selectError) {
      logSupabaseError("Supabase: player_profiles select error", selectError);
      return { success: false, data: null, error: toSupabaseErrorInfo(selectError) };
    }

    if (!profile?.id) {
      return {
        success: false,
        data: null,
        error: {
          message: "Choose Player on the role screen to create your profile.",
          code: null,
          details: null,
          hint: null,
        },
      };
    }

    return { success: true, data: { role: "player", user: userRow as UserRow, profile } };
  }

  const { data: profile, error: selectError } = await supabase
    .from("scout_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    logSupabaseError("Supabase: scout_profiles select error", selectError);
    return { success: false, data: null, error: toSupabaseErrorInfo(selectError) };
  }

  if (!profile?.id) {
    return {
      success: false,
      data: null,
      error: {
        message: "Choose Scout on the role screen to create your profile.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  return { success: true, data: { role: "scout", user: userRow as UserRow, profile } };
}

function mergeSanitizedPlayerStrings(
  patch: Database["public"]["Tables"]["player_profiles"]["Update"],
): Database["public"]["Tables"]["player_profiles"]["Update"] {
  const strIn: PlayerProfileSanitizedPatch = {};
  const keys: (keyof PlayerProfileSanitizedPatch)[] = [
    "full_name",
    "username",
    "bio",
    "position",
    "preferred_foot",
    "city",
    "country",
    "club",
  ];
  for (const k of keys) {
    if (k in patch && patch[k] !== undefined) {
      strIn[k] = patch[k] === null ? "" : String(patch[k]);
    }
  }
  const strOut = sanitizePlayerProfileStrings(strIn);
  return { ...patch, ...strOut };
}

function mergeSanitizedScoutStrings(
  patch: Database["public"]["Tables"]["scout_profiles"]["Update"],
): Database["public"]["Tables"]["scout_profiles"]["Update"] {
  const strIn: ScoutProfileSanitizedPatch = {};
  const keys: (keyof ScoutProfileSanitizedPatch)[] = [
    "bio",
    "organization",
    "role",
    "city",
    "country",
  ];
  for (const k of keys) {
    if (k in patch && patch[k] !== undefined) {
      strIn[k] = patch[k] === null ? "" : String(patch[k]);
    }
  }
  const strOut = sanitizeScoutProfileStrings(strIn);
  return { ...patch, ...strOut };
}

export async function savePlayerProfile(
  patch: Database["public"]["Tables"]["player_profiles"]["Update"]
): Promise<Result<PlayerProfileRow>> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return {
      success: false,
      data: null,
      error: { message: "You must be logged in.", code: null, details: null, hint: null },
    };
  }

  const safePatch = mergeSanitizedPlayerStrings(patch);

  const retryPatch: Database["public"]["Tables"]["player_profiles"]["Update"] = {
    ...safePatch,
  };
  let updateError = (
    await supabase.from("player_profiles").upsert({ id: userId, ...retryPatch }, { onConflict: "id" })
  ).error;

  const removedColumns = new Set<string>();
  while (updateError) {
    const missingColumn = getMissingColumnFromSchemaCacheError(updateError, "player_profiles");
    if (!missingColumn) break;
    if (removedColumns.has(missingColumn)) break;
    removedColumns.add(missingColumn);
    delete retryPatch[missingColumn as keyof typeof retryPatch];
    updateError = (
      await supabase.from("player_profiles").upsert({ id: userId, ...retryPatch }, { onConflict: "id" })
    ).error;
  }

  if (!updateError && removedColumns.size > 0 && isDev) {
    console.warn(
      `[PitchRusch] player_profiles columns missing in DB (${Array.from(removedColumns).join(", ")}) — saved other fields. Apply latest player premium migration.`,
    );
  }

  if (updateError) {
    logSupabaseError("Supabase: player_profiles update error", updateError);
    return { success: false, data: null, error: toSupabaseErrorInfo(updateError) };
  }

  const { data: profile, error: selectError } = await supabase
    .from("player_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    logSupabaseError("Supabase: player_profiles select (after save) error", selectError);
    return { success: false, data: null, error: toSupabaseErrorInfo(selectError) };
  }

  if (!profile?.id) {
    return {
      success: false,
      data: null,
      error: { message: "Saved, but could not reload profile.", code: null, details: null, hint: null },
    };
  }

  return { success: true, data: profile };
}

export async function saveScoutProfile(
  patch: Database["public"]["Tables"]["scout_profiles"]["Update"]
): Promise<Result<ScoutProfileRow>> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return {
      success: false,
      data: null,
      error: { message: "You must be logged in.", code: null, details: null, hint: null },
    };
  }

  const safePatch = mergeSanitizedScoutStrings(patch);

  let updateError = (
    await supabase.from("scout_profiles").upsert({ id: userId, ...safePatch }, { onConflict: "id" })
  ).error;

  if (updateError && isScoutProfilesMissingBioColumnError(updateError)) {
    const withoutBio: Database["public"]["Tables"]["scout_profiles"]["Update"] = { ...safePatch };
    delete withoutBio.bio;
    const retry = await supabase
      .from("scout_profiles")
      .upsert({ id: userId, ...withoutBio }, { onConflict: "id" });
    updateError = retry.error;
    if (!updateError && isDev) {
      console.warn(
        "[PitchRusch] scout_profiles.bio column missing in DB — saved other fields. Apply migration 20260506120000_scout_profiles_bio.sql.",
      );
    }
  }

  if (updateError) {
    logSupabaseError("Supabase: scout_profiles update error", updateError);
    return { success: false, data: null, error: toSupabaseErrorInfo(updateError) };
  }

  const { data: profile, error: selectError } = await supabase
    .from("scout_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    logSupabaseError("Supabase: scout_profiles select (after save) error", selectError);
    return { success: false, data: null, error: toSupabaseErrorInfo(selectError) };
  }

  if (!profile?.id) {
    return {
      success: false,
      data: null,
      error: { message: "Saved, but could not reload profile.", code: null, details: null, hint: null },
    };
  }

  return { success: true, data: profile };
}

/**
 * Canonical profile image URL: `public.users.avatar_url` only.
 */
export async function updateUserAvatarUrl(url: string | null): Promise<Result<UserRow>> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return {
      success: false,
      data: null,
      error: { message: "You must be logged in.", code: null, details: null, hint: null },
    };
  }

  const trimmed = url?.trim() || null;

  const { error: userErr } = await supabase
    .from("users")
    .update({ avatar_url: trimmed })
    .eq("id", userId);

  if (userErr) {
    logSupabaseError("Supabase: users avatar_url update", userErr);
    return { success: false, data: null, error: toSupabaseErrorInfo(userErr) };
  }

  const { data: userRow, error: selErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) {
    logSupabaseError("Supabase: users select (after avatar save)", selErr);
    return { success: false, data: null, error: toSupabaseErrorInfo(selErr) };
  }

  if (!userRow?.id) {
    return {
      success: false,
      data: null,
      error: { message: "Saved, but could not reload user.", code: null, details: null, hint: null },
    };
  }

  return { success: true, data: userRow as UserRow };
}

