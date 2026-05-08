import { isDev } from "@/lib/devLog";

/**
 * When true, an effective `super_admin` may use challenge upload without `users.role = player`.
 * Only `next dev` — production builds keep the normal player-only rule for all non-players.
 */
export function isChallengeUploadSuperAdminBypassEnabled(): boolean {
  return isDev;
}
