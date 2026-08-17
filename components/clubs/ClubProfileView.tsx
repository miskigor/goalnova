"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { VerifiedAcademyBadge } from "@/components/clubs/VerifiedAcademyBadge";
import {
  rpcClubGetPublic,
  type ClubPublicDetail,
  type ClubRecentVideo,
  type ClubTopPlayer,
} from "@/lib/supabase/clubs";
import { GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { supabase } from "@/lib/supabase/client";

type Props = {
  slug: string;
};

export function ClubProfileView({ slug }: Props) {
  const t = useTranslations("clubs");
  const [club, setClub] = useState<ClubPublicDetail | null>(null);
  const [topPlayers, setTopPlayers] = useState<ClubTopPlayer[]>([]);
  const [recentVideos, setRecentVideos] = useState<ClubRecentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await rpcClubGetPublic(slug);
      if (cancelled) return;
      if (!result.found || !result.club) {
        setNotFound(true);
        setClub(null);
      } else {
        setClub(result.club);
        setTopPlayers(result.topPlayers);
        setRecentVideos(result.recentVideos);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setAuthed(Boolean(data.session?.user));
    });
  }, []);

  if (loading) {
    return <p className="px-4 py-10 text-center text-sm text-gn-text-secondary">{t("loading")}</p>;
  }

  if (notFound || !club) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-gn-text">{t("clubNotFound")}</p>
        <Link href="/clubs" className={`${GN_SECONDARY_BUTTON_CLASS} mt-4 inline-flex`}>
          {t("backToClubs")}
        </Link>
      </div>
    );
  }

  const isVerified = club.verified_partner && club.partnership_status === "active";
  const inviteUrl = `https://pitchrusch.com/invite/${club.club_code}`;

  return (
    <div className="mx-auto min-w-0 max-w-5xl pb-12">
      <div className="relative h-44 overflow-hidden bg-gn-surface sm:h-56 md:h-64">
        {club.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={club.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_30%,rgba(249,115,22,0.35),transparent_50%),linear-gradient(180deg,#151515,#000)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-gn-border-subtle bg-gn-surface-elevated shadow-xl sm:h-28 sm:w-28">
              {club.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={club.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl">⚽</span>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gn-text sm:text-2xl">{club.name}</h1>
                {isVerified ? <VerifiedAcademyBadge kind={club.organization_kind} /> : null}
              </div>
              <p className="text-sm text-gn-text-secondary">
                {[club.city, club.country].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
          {authed ? (
            <div className="flex flex-wrap gap-2 pb-1">
              <Link href={`/clubs/dashboard?club=${club.id}`} className={`${GN_SECONDARY_BUTTON_CLASS} min-h-11 inline-flex items-center`}>
                {t("clubDashboard")}
              </Link>
            </div>
          ) : null}
        </div>

        <p className="mt-4 rounded-xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-3 text-sm text-gn-text-secondary">
          {t("profilePartnerClubsHint")}
        </p>

        {club.showcase_public && isVerified ? (
          <section className="mt-6 rounded-2xl border border-gn-accent/35 bg-gradient-to-br from-gn-accent/10 to-transparent p-5">
            <h2 className="text-lg font-bold text-gn-text">
              🏆 {club.name}
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-gn-text-secondary sm:grid-cols-2">
              <li>⚽ {t("showcasePlayers", { count: club.approved_player_count })}</li>
              <li>⭐ {club.total_xp.toLocaleString()} XP</li>
              <li>📹 {t("showcaseVideos", { count: club.total_videos })}</li>
              {club.global_rank ? (
                <li>🔥 {t("showcaseRank", { rank: club.global_rank })}</li>
              ) : null}
            </ul>
            <p className="mt-3 text-sm font-medium text-gn-accent">{t("meetOurPlayers")}</p>
          </section>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            [t("statPlayers"), club.approved_player_count],
            ["XP", club.total_xp.toLocaleString()],
            [t("videosShort"), club.total_videos],
            [t("statRank"), club.global_rank ? `#${club.global_rank}` : "—"],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gn-text-tertiary">{label}</p>
              <p className="mt-1 text-lg font-bold text-gn-text">{value}</p>
            </div>
          ))}
        </div>

        {club.description ? (
          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gn-text-tertiary">
              {t("aboutClub")}
            </h2>
            <p className="text-sm leading-relaxed text-gn-text-secondary">{club.description}</p>
          </section>
        ) : null}

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gn-text-tertiary">
            {t("inviteLink")}
          </h2>
          <p className="break-all rounded-xl border border-gn-border-subtle bg-black/40 px-4 py-3 font-mono text-xs text-gn-accent sm:text-sm">
            {inviteUrl}
          </p>
          <p className="text-xs text-gn-text-tertiary">{t("inviteHint", { code: club.club_code })}</p>
        </section>

        {topPlayers.length > 0 ? (
          <section className="mt-10 space-y-4">
            <h2 className="text-lg font-semibold text-gn-text">{t("topPlayers")}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topPlayers.map((player) => (
                <Link
                  key={player.user_id}
                  href={`/player/${player.username || player.user_id}`}
                  className="flex items-center gap-3 rounded-xl border border-gn-border-subtle bg-gn-surface/30 p-3 transition hover:border-gn-accent/35"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gn-surface-elevated">
                    {player.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={player.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">👤</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gn-text">{player.display_name}</p>
                    <p className="text-xs text-gn-text-secondary">{player.xp} XP</p>
                  </div>
                  {player.club_verified ? (
                    <VerifiedAcademyBadge compact kind={club.organization_kind} />
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {recentVideos.length > 0 ? (
          <section className="mt-10 space-y-4">
            <h2 className="text-lg font-semibold text-gn-text">{t("latestVideos")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {recentVideos.map((video) => (
                <Link
                  key={video.id}
                  href={`/watch/${video.id}`}
                  className="overflow-hidden rounded-xl border border-gn-border-subtle bg-gn-surface/30"
                >
                  <div className="aspect-[9/16] bg-black/50">
                    {video.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
