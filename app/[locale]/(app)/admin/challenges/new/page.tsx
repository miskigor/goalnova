import { AdminChallengesPage } from "@/components/admin/AdminChallengesPage";

/**
 * Locale-aware create flow: `/admin/challenges/new` (and `/[locale]/admin/challenges/new` when needed).
 * Same admin layout + {@link AdminGate} as the list page.
 */
export default function AdminNewChallengePage() {
  return <AdminChallengesPage defaultMode="create" />;
}
