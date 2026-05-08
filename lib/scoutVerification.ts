export type ScoutVerificationStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected";

const STATUSES = new Set(["none", "pending", "approved", "rejected"]);

export function parseScoutVerificationStatus(
  raw: string | null | undefined,
): ScoutVerificationStatus {
  if (raw && STATUSES.has(raw)) {
    return raw as ScoutVerificationStatus;
  }
  return "none";
}

export function isApprovedScoutUser(row: {
  role: string;
  scout_verification_status?: string | null;
}): boolean {
  return (
    row.role === "scout" &&
    parseScoutVerificationStatus(row.scout_verification_status) === "approved"
  );
}

/**
 * Scout account that is not verified as approved (`none`, `pending`, or `rejected`).
 * Prefer this over `role === "scout" && !isApprovedScout` in UI — it ties the check to
 * `scout_verification_status`, not role alone.
 */
export function isUnverifiedScoutUser(row: {
  role: string;
  scout_verification_status?: string | null;
}): boolean {
  if (row.role !== "scout") return false;
  return !isApprovedScoutUser(row);
}

/**
 * Players may message freely; scouts only after verification approval.
 */
export function userMayMessagePlayers(row: {
  role: string;
  scout_verification_status?: string | null;
}): boolean {
  if (row.role !== "scout") return true;
  return isApprovedScoutUser(row);
}
