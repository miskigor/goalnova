import type { User } from "@supabase/supabase-js";

/** True when Supabase Auth has confirmed the user's email (`email_confirmed_at`). */
export function isEmailConfirmed(
  user: Pick<User, "email_confirmed_at"> | null | undefined,
): boolean {
  if (!user) return false;
  return Boolean(user.email_confirmed_at);
}
