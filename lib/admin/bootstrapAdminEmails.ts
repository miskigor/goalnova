/** Server- and client-safe bootstrap staff emails when `users.admin_role` is not set yet. */
export const BOOTSTRAP_ADMIN_EMAILS = ["royalexpert1@gmail.com"] as const;

export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return (BOOTSTRAP_ADMIN_EMAILS as readonly string[]).includes(normalized);
}
