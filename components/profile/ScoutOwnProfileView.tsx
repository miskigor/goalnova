"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import {
  isApprovedScoutUser,
  parseScoutVerificationStatus,
} from "@/lib/scoutVerification";
import { VerifiedScoutBadge } from "@/components/scout/VerifiedScoutBadge";
import type { Database } from "@/lib/supabase/client";

const FREE_SCOUT_FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5"] as const;

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ScoutProfileRow = Database["public"]["Tables"]["scout_profiles"]["Row"];

export type ScoutOwnProfileViewProps = {
  user: UserRow;
  profile: ScoutProfileRow;
};

function emailLocalPart(email: string | null | undefined): string | null {
  const e = email?.trim();
  if (!e) return null;
  const idx = e.indexOf("@");
  return idx > 0 ? e.slice(0, idx).trim() || null : e;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const v = value?.trim();
  if (!v) return null;
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gn-text-tertiary sm:text-xs">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gn-text">{v}</p>
    </div>
  );
}

export function ScoutOwnProfileView({ user, profile }: ScoutOwnProfileViewProps) {
  const tProfile = useTranslations("profile");
  const tPremium = useTranslations("premium");
  const tFields = useTranslations("profileEditor");
  const tOnboardingRole = useTranslations("onboardingRole");
  const tSv = useTranslations("scoutVerification");
  const tPlayer = useTranslations("playerProfile");

  const isPremiumPlan = Boolean(user.is_premium);

  const scoutStatus = parseScoutVerificationStatus(user.scout_verification_status);
  const approved = isApprovedScoutUser({
    role: user.role,
    scout_verification_status: user.scout_verification_status,
  });

  const displayName =
    user.scout_apply_full_name?.trim() ||
    profile.organization?.trim() ||
    emailLocalPart(user.email) ||
    tOnboardingRole("scout");

  const dn = displayName.trim();
  const subtitleParts = [profile.role?.trim(), profile.organization?.trim()].filter(
    (p): p is string => Boolean(p && p !== dn),
  );
  const subtitle = subtitleParts.join(" · ") || tOnboardingRole("scout");

  const avatarUrl = user.avatar_url?.trim() || null;

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 pb-8 lg:max-w-2xl">
      <header className="space-y-3">
        <div className="flex flex-row-reverse items-start gap-3 sm:flex-row">
          <ProfileAvatar name={displayName} imageUrl={avatarUrl || undefined} />
          <div className="min-w-0 flex-1 space-y-1 text-end sm:text-start">
            <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-start">
              <h1 className="min-w-0 max-w-full break-words text-2xl font-semibold tracking-tight text-gn-text-primary">
                {displayName}
              </h1>
              {approved ? (
                <span className="shrink-0">
                  <VerifiedScoutBadge />
                </span>
              ) : null}
            </div>
            <p className="text-sm text-gn-text-secondary sm:text-start">{subtitle}</p>
          </div>
        </div>
        {!approved && scoutStatus === "pending" ? (
          <p className="rounded-xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-3 text-sm text-gn-text-secondary">
            {tSv("pendingBody")}
          </p>
        ) : null}
        <div className="flex justify-end sm:justify-start">
          <Link
            href="/settings/profile"
            className="inline-flex items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-4 py-2 text-sm font-medium text-gn-text transition-colors hover:border-gn-accent/40 hover:bg-gn-surface-elevated"
          >
            {tProfile("editProfile")}
          </Link>
        </div>
      </header>

      <section
        aria-label={tProfile("scoutDetailsAria")}
        className="space-y-4 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4 sm:p-5"
      >
        <DetailRow label={tFields("organization")} value={profile.organization} />
        <DetailRow label={tFields("scoutRole")} value={profile.role} />
        <DetailRow label={tFields("city")} value={profile.city} />
        <DetailRow label={tFields("country")} value={profile.country} />
        {profile.bio?.trim() ? (
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gn-text-tertiary sm:text-xs">
              {tFields("bio")}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gn-text">
              {profile.bio.trim()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gn-text-tertiary">{tPlayer("bioEmpty")}</p>
        )}
      </section>

      <section
        aria-label={tProfile("scoutPlanSectionAria")}
        className="space-y-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/25 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gn-text-tertiary">
            {isPremiumPlan ? tPremium("scoutPlans.pro.title") : tPremium("scoutPlans.free.title")}
          </h2>
          <span className="text-sm font-semibold text-gn-text">
            {isPremiumPlan ? tPremium("scoutPlans.pro.price") : tPremium("scoutPlans.free.price")}
          </span>
        </div>
        <p className="text-sm text-gn-text-secondary">
          {isPremiumPlan ? tProfile("scoutPlanProIntro") : tProfile("scoutPlanFreeIntro")}
        </p>
        {!isPremiumPlan ? (
          <ul className="list-disc space-y-1.5 ps-5 text-sm text-gn-text-secondary">
            {FREE_SCOUT_FEATURE_KEYS.map((key) => (
              <li key={key}>{tPremium(`scoutPlans.free.${key}`)}</li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs leading-relaxed text-gn-text-tertiary">{tProfile("scoutPlanLimitsNote")}</p>
      </section>
    </div>
  );
}
