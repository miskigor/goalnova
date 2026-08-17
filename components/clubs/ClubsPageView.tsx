"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ClubCard } from "@/components/clubs/ClubCard";
import {
  rpcClubRankingsPublic,
  rpcClubsListPublic,
  rpcClubManagedList,
  type ClubListRow,
  type ManagedClubProfile,
} from "@/lib/supabase/clubs";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminClubPendingCount } from "@/components/layout/AdminSupportUnreadContext";

export function ClubsPageView() {
  const t = useTranslations("clubs");
  const { loaded: adminLoaded, isAdmin } = useAdminAccess();
  const clubPending = useAdminClubPendingCount();
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<ClubListRow[]>([]);
  const [topClubs, setTopClubs] = useState<ClubListRow[]>([]);
  const [managedClubs, setManagedClubs] = useState<ManagedClubProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const skipManagedList = adminLoaded && isAdmin;
    const [list, rankings, managed] = await Promise.all([
      rpcClubsListPublic(search, 24, 0),
      rpcClubRankingsPublic(10),
      skipManagedList ? Promise.resolve({ clubs: [] as ManagedClubProfile[] }) : rpcClubManagedList(),
    ]);
    setClubs(list.rows);
    setTopClubs(rankings.rows);
    setManagedClubs(skipManagedList ? [] : managed.clubs);
    setLoading(false);
  }, [adminLoaded, isAdmin, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-3">
        <p className="text-3xl" aria-hidden>
          🏟
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gn-text sm:text-3xl">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-gn-text-secondary sm:text-base">
          {t("subtitle")}
        </p>
        {adminLoaded && isAdmin ? null : (
          <Link href="/clubs/become-partner" className={`${GN_PRIMARY_BUTTON_CLASS} inline-flex`}>
            {t("becomePartnerCta")}
          </Link>
        )}
        {adminLoaded && isAdmin ? (
          <Link
            href="/admin/clubs"
            className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left text-sm font-medium text-amber-100 transition hover:bg-amber-500/16"
          >
            <span>
              {clubPending > 0
                ? t("adminPendingInAdminBanner", { count: clubPending })
                : t("adminTitle")}
            </span>
            <span className="shrink-0 rounded-full bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-50">
              {t("adminPendingInAdminCta")}
            </span>
          </Link>
        ) : managedClubs.length > 0 ? (
          <div className="space-y-2">
            {managedClubs.map((club) => (
              <Link
                key={club.id}
                href={`/clubs/dashboard?club=${encodeURIComponent(club.id)}`}
                className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-gn-accent/40 bg-gn-accent/10 px-4 py-3 text-left text-sm font-medium text-gn-text transition hover:bg-gn-accent/16"
              >
                <span>{t("manageClubTitle")}: {club.name}</span>
                <span className="shrink-0 text-xs text-gn-accent">{t("manageClubHintShort")}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      {topClubs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
            {t("topClubsTitle")}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
            {topClubs.map((club) => (
              <div key={club.id} className="w-[min(280px,85vw)] shrink-0">
                <ClubCard club={club} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gn-text">{t("allClubsTitle")}</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-h-11 w-full rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-4 text-sm text-gn-text outline-none ring-gn-accent/30 placeholder:text-gn-text-tertiary focus:border-gn-accent/50 focus:ring-2 sm:max-w-xs"
          />
        </div>

        {loading ? (
          <p className="text-sm text-gn-text-secondary">{t("loading")}</p>
        ) : clubs.length === 0 ? (
          <p className="text-sm text-gn-text-secondary">{t("empty")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
