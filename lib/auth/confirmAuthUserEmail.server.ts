import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isEmailConfirmed } from "@/lib/auth/emailConfirmed";
import type { User } from "@supabase/supabase-js";

export function isEmailNotConfirmedAuthError(error: {
  message?: string;
  code?: string;
}): boolean {
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("email not verified") ||
    msg.includes("email address is not confirmed")
  );
}

export async function findAuthUserIdByEmail(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data.users?.length) return null;

    const match = data.users.find(
      (u) => (u.email ?? "").trim().toLowerCase() === normalized,
    );
    if (match?.id) return match.id;

    if (data.users.length < 200) break;
  }

  return null;
}

/** Marks auth user email confirmed (service role). Idempotent if already confirmed. */
export async function confirmAuthUserEmailById(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const id = userId.trim();
  if (!id) return false;

  const { data, error } = await admin.auth.admin.updateUserById(id, {
    email_confirm: true,
  });

  if (error) {
    console.error("[confirmAuthUserEmail] updateUserById failed", error.message);
    return false;
  }

  const user = data.user;
  return Boolean(user && isEmailConfirmed(user));
}

/**
 * Legacy accounts: Supabase may reject login until email is confirmed.
 * After a valid password sign-in attempt returns `email_not_confirmed`, confirm and retry once.
 */
export async function confirmAuthUserEmailByEmail(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<boolean> {
  const userId = await findAuthUserIdByEmail(admin, email);
  if (!userId) return false;
  return confirmAuthUserEmailById(admin, userId);
}

export function userNeedsEmailConfirmation(user: User | null | undefined): boolean {
  return Boolean(user?.id) && !isEmailConfirmed(user);
}
