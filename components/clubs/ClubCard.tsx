"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { VerifiedAcademyBadge } from "@/components/clubs/VerifiedAcademyBadge";
import type { ClubListRow } from "@/lib/supabase/clubs";
import { GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

type Props = {
  club: ClubListRow;
};

export function ClubCard({ club }: Props) {
  const t = useTranslations("clubs");
  const isVerified =
    club.verified_partner && club.partnership_status === "active";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-gn-border-subtle bg-gn-surface/40 shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition duration-300 ease-gn-smooth hover:border-gn-accent/35 hover:shadow-[0_12px_40px_rgba(249,115,22,0.12)] motion-safe:hover:-translate-y-0.5">
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-gn-surface-elevated to-black sm:h-32">
        {club.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={club.cover_url}
            alt=""
            className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.25),transparent_55%),linear-gradient(135deg,#121314,#000)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {isVerified ? (
          <div className="absolute start-3 top-3">
            <VerifiedAcademyBadge compact />
          </div>
        ) : null}
        {club.global_rank != null && club.global_rank > 0 ? (
          <div className="absolute end-3 top-3 rounded-full border border-gn-accent/40 bg-black/70 px-2 py-0.5 text-[10px] font-bold tabular-nums text-gn-accent">
            #{club.global_rank}
          </div>
        ) : null}
      </div>

      <div className="relative px-4 pb-4 pt-10">
        <div className="absolute -top-8 start-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-gn-border-subtle bg-gn-surface-elevated shadow-lg">
          {club.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={club.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl" aria-hidden>
              ⚽
            </span>
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-base font-bold text-gn-text">{club.name}</h3>
          <p className="text-xs text-gn-text-secondary">
            {[club.city, club.country].filter(Boolean).join(", ") || "—"}
          </p>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-gn-border-subtle/80 bg-black/30 px-2 py-2">
            <dt className="text-[10px] uppercase tracking-wider text-gn-text-tertiary">
              {t("playersShort")}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-gn-text">
              {club.approved_player_count}
            </dd>
          </div>
          <div className="rounded-xl border border-gn-border-subtle/80 bg-black/30 px-2 py-2">
            <dt className="text-[10px] uppercase tracking-wider text-gn-text-tertiary">XP</dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-gn-text">
              {club.total_xp.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-xl border border-gn-border-subtle/80 bg-black/30 px-2 py-2">
            <dt className="text-[10px] uppercase tracking-wider text-gn-text-tertiary">
              {t("videosShort")}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-gn-text">
              {club.total_videos}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <Link
            href={`/clubs/${club.slug}`}
            className={`${GN_SECONDARY_BUTTON_CLASS} min-h-10 w-full justify-center text-sm`}
          >
            {t("viewClub")}
          </Link>
        </div>
      </div>
    </article>
  );
}
