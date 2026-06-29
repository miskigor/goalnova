"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { notifyClubPlayerJoin } from "@/lib/clubs/notifyClubPlayerJoin.client";
import { rpcClubJoin, type PlayerClubBadge } from "@/lib/supabase/clubs";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { VerifiedAcademyBadge } from "@/components/clubs/VerifiedAcademyBadge";

type Props = {
  clubBadge: PlayerClubBadge | null;
  onMembershipChange: () => void;
};

export function ProfilePartnerClubSection({ clubBadge, onMembershipChange }: Props) {
  const t = useTranslations("clubs");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setStatus(t("joinErrorCodeRequired"));
      return;
    }

    setJoining(true);
    const result = await rpcClubJoin({ clubCode: normalized });
    setJoining(false);

    if (result.ok && result.clubId) {
      void notifyClubPlayerJoin({
        clubId: result.clubId,
        membershipId: result.membershipId,
      });
      setCode("");
      setStatus(t("profileClubJoinSuccess", { club: result.clubName ?? normalized }));
      onMembershipChange();
      return;
    }

    if (result.error === "already_member") {
      setStatus(t("alreadyMember"));
      onMembershipChange();
      return;
    }
    if (result.error === "club_not_found") {
      setStatus(t("joinErrorClubNotFound"));
      return;
    }
    setStatus(t("joinError"));
  }

  return (
    <section
      className="rounded-xl border border-gn-border-subtle bg-gn-surface/30 p-3 max-lg:p-2.5"
      aria-labelledby="profile-partner-clubs-title"
    >
      <h2
        id="profile-partner-clubs-title"
        className="text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary"
      >
        {t("profilePartnerClubsTitle")}
      </h2>

      {clubBadge?.has_club && clubBadge.club_name ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-gn-text">
            {t("profileClubMember", { club: clubBadge.club_name })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {clubBadge.verified_academy ? <VerifiedAcademyBadge compact /> : null}
            {clubBadge.club_slug ? (
              <Link href={`/clubs/${clubBadge.club_slug}`} className="text-sm font-medium text-gn-accent hover:underline">
                {t("profileClubViewClub")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1.5 text-xs leading-relaxed text-gn-text-secondary">{t("profilePartnerClubsHint")}</p>
          <form onSubmit={(e) => void submitCode(e)} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("profilePartnerClubsCodePlaceholder")}
              aria-label={t("profilePartnerClubsCodePlaceholder")}
              className="min-h-11 flex-1 rounded-xl border border-gn-border-subtle bg-black/40 px-3 font-mono text-sm uppercase tracking-wider text-gn-text outline-none focus:border-gn-accent/50"
            />
            <button type="submit" disabled={joining} className={`${GN_PRIMARY_BUTTON_CLASS} min-h-11 shrink-0 px-4`}>
              {joining ? t("profileClubJoining") : t("profileClubConfirm")}
            </button>
          </form>
        </>
      )}

      {status ? (
        <p role="status" className="mt-2 text-xs text-gn-accent">
          {status}
        </p>
      ) : null}
    </section>
  );
}
