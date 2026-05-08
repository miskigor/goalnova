"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PlayerProfileRow } from "@/lib/supabase/discoverPlayers";

function textOr(value: string | null | undefined, fallback: string): string {
  const t = value?.trim();
  return t ? t : fallback;
}

export function PlayerDiscoverCard({ row }: { row: PlayerProfileRow }) {
  const t = useTranslations("discover");
  const dash = t("dash");

  const fullName = textOr(row.full_name, t("unknownPlayer"));
  const username = textOr(row.username, dash);
  const age =
    typeof row.age === "number" && Number.isFinite(row.age)
      ? String(row.age)
      : dash;
  const position = textOr(row.position, dash);
  const city = textOr(row.city, dash);
  const country = textOr(row.country, dash);
  const club = textOr(row.club, dash);

  return (
    <article className="rounded-xl border border-gn-border-subtle bg-gn-surface p-4 shadow-sm transition-colors hover:border-gn-accent/30">
      <Link
        href={`/player/${row.id}`}
        className="block outline-none ring-gn-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg rounded-lg -m-1 p-1"
      >
        <h2 className="text-base font-semibold text-gn-text-primary">
          {fullName}
        </h2>
        <p className="mt-0.5 text-sm text-gn-text-secondary">@{username}</p>
      </Link>
      <dl className="mt-3 grid gap-1.5 text-sm text-gn-text-secondary">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-gn-text-tertiary">{t("cardAge")}</dt>
          <dd className="text-gn-text-primary">{age}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-gn-text-tertiary">{t("cardPosition")}</dt>
          <dd className="text-gn-text-primary">{position}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-gn-text-tertiary">{t("cardLocation")}</dt>
          <dd className="text-gn-text-primary">
            {city}, {country}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-gn-text-tertiary">{t("cardClub")}</dt>
          <dd className="text-gn-text-primary">{club}</dd>
        </div>
      </dl>
    </article>
  );
}
