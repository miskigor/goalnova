import { BOOTSTRAP_ADMIN_EMAILS } from "@/lib/admin/bootstrapAdminEmails";

/** Inboxes that receive new club partnership request alerts. */
export function clubPartnershipStaffNotifyEmails(): string[] {
  const raw = process.env.CLUB_PARTNERSHIP_NOTIFY_EMAIL?.trim();
  if (raw) {
    const parsed = raw
      .split(/[,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (parsed.length > 0) return parsed;
  }
  return [...BOOTSTRAP_ADMIN_EMAILS];
}
