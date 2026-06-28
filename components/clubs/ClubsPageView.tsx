"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ClubCard } from "@/components/clubs/ClubCard";
import {
  rpcClubJoin,
  rpcClubRankingsPublic,
  rpcClubsListPublic,
  type ClubListRow,
} from "@/lib/supabase/clubs";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { supabase } from "@/lib/supabase/client";

export function ClubsPageView() {
  const t = useTranslations("clubs");
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<ClubListRow[]>([]);
  const [topClubs, setTopClubs] = useState<ClubListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, rankings] = await Promise.all([
      rpcClubsListPublic(search, 24, 0),
      rpcClubRankingsPublic(10),
    ]);
    setClubs(list.rows);
    setTopClubs(rankings.rows);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setAuthed(Boolean(data.session?.user));
    });
  }, []);

  async function handleJoin(clubId: string) {
    if (!authed) {
      setMessage(t("signInToJoin"));
      return;
    }
    setJoiningId(clubId);
    setMessage(null);
    const result = await rpcClubJoin({ clubId });
    setJoiningId(null);
    if (result.ok) {
      setMessage(t("joinPending", { club: result.clubName ?? "" }));
    } else {
      setMessage(result.error === "already_member" ? t("alreadyMember") : t("joinError"));
    }
  }

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
        <Link href="/clubs/become-partner" className={`${GN_PRIMARY_BUTTON_CLASS} inline-flex`}>
          {t("becomePartnerCta")}
        </Link>
      </header>

      {topClubs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
            {t("topClubsTitle")}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
            {topClubs.map((club) => (
              <div key={club.id} className="w-[min(280px,85vw)] shrink-0">
                <ClubCard club={club} onJoin={authed ? handleJoin : undefined} joining={joiningId === club.id} />
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

        {message ? (
          <p role="status" className="rounded-xl border border-gn-accent/30 bg-gn-accent/10 px-4 py-3 text-sm text-gn-text">
            {message}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-gn-text-secondary">{t("loading")}</p>
        ) : clubs.length === 0 ? (
          <p className="text-sm text-gn-text-secondary">{t("empty")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                onJoin={authed ? handleJoin : undefined}
                joining={joiningId === club.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
