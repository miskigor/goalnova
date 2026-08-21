import { supabase, type Database } from "./client";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type Role = "player" | "scout";

type SupabaseErrorInfo = {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type RoleSaveResult =
  | { success: true; userRow: UserRow }
  | { success: false; userRow: null; error: SupabaseErrorInfo };

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

export async function saveRoleAndEnsureProfile({
  role,
  languagePreference = "en",
}: {
  role: Role;
  languagePreference?: string;
}): Promise<RoleSaveResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    logSupabaseError("Supabase: getUser error", authError);
  }

  const authUser = authData.user;
  if (!authUser?.id) {
    return {
      success: false,
      userRow: null,
      error: {
        message: "You must be logged in to finish onboarding.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  const userId = authUser.id;
  const userEmail = authUser.email ?? null;

  // Update (or create) users row with chosen role + language preference.
  const { error: upsertUserError } = await supabase.from("users").upsert(
    {
      id: userId,
      email: userEmail,
      role,
      language_preference: languagePreference,
    },
    { onConflict: "id" }
  );

  if (upsertUserError) {
    logSupabaseError("Supabase: users upsert (role) error", upsertUserError);
    return { success: false, userRow: null, error: toSupabaseErrorInfo(upsertUserError) };
  }

  // Confirm `users.role` is persisted before proceeding.
  const { data: confirmedUser, error: confirmUserError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (confirmUserError) {
    logSupabaseError("Supabase: users select (confirm role) error", confirmUserError);
    return { success: false, userRow: null, error: toSupabaseErrorInfo(confirmUserError) };
  }

  if (!confirmedUser?.id) {
    return {
      success: false,
      userRow: null,
      error: {
        message: "Role was saved, but we could not confirm your user record.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  if (confirmedUser.role !== role) {
    return {
      success: false,
      userRow: null,
      error: {
        message:
          "Role save could not be confirmed. Please try again.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  // Ensure the correct profile table row exists.
  const profileTable = role === "player" ? "player_profiles" : "scout_profiles";
  const { error: upsertProfileError } = await supabase
    .from(profileTable)
    .upsert({ id: userId }, { onConflict: "id", defaultToNull: false } as never);

  if (upsertProfileError) {
    logSupabaseError(`Supabase: ${profileTable} upsert error`, upsertProfileError);
    return {
      success: false,
      userRow: null,
      error: toSupabaseErrorInfo(upsertProfileError),
    };
  }

  // Confirm profile row exists before returning success.
  const { data: profileRow, error: profileSelectError } = await supabase
    .from(profileTable)
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileSelectError) {
    logSupabaseError(`Supabase: ${profileTable} select (confirm) error`, profileSelectError);
    return { success: false, userRow: null, error: toSupabaseErrorInfo(profileSelectError) };
  }

  if (!profileRow?.id) {
    return {
      success: false,
      userRow: null,
      error: {
        message:
          "Profile setup could not be confirmed. Please try again.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  return { success: true, userRow: confirmedUser as UserRow };
}

