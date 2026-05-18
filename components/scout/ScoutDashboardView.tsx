"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { supabase } from "@/lib/supabase/client";
import {
  fetchScoutRecentContacts,
  fetchScoutSavedPlayersForDashboard,
  fetchScoutSuggestedTalents,
  playerProfileHref,
  type ScoutRecentContactRow,
  type ScoutSavedPlayerDashboardRow,
} from "@/lib/supabase/scoutDashboard";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";
import { FeedItemCard } from "@/components/home/FeedItemCard";
import { HomeFeedSoundProvider } from "@/components/home/HomeFeedSoundContext";
import { feedItemVideoKey } from "@/lib/feed/feedItemVideoKey";
import { VerifiedScoutBadge } from "@/components/scout/VerifiedScoutBadge";
import { ScoutDashboardOverflowDebug } from "@/components/scout/ScoutDashboardOverflowDebug";
import { SCOUT_DASHBOARD_SECTION_CLASS } from "@/lib/layout/appShellClasses";

const dashboardContentClass =
  "box-border w-full min-w-0 max-w-full space-y-8 overflow-x-clip pb-12 pt-2";

const sectionCardClass = `${SCOUT_DASHBOARD_SECTION_CLASS} rounded-2xl border border-gn-border-subtle bg-gn-surface/40 shadow-sm backdrop-blur-sm`;

const scoutPrimaryCtaClass = `${GN_PRIMARY_BUTTON_CLASS} box-border flex w-full min-w-0 max-w-full items-center justify-center truncate py-3.5 shadow-none sm:inline-flex sm:w-auto sm:shadow-[0_8px_28px_-6px_rgba(249,115,22,0.45)]`;

const scoutSecondaryCtaClass =
  "box-border flex w-full min-w-0 max-w-full items-center justify-center truncate rounded-xl border border-gn-border-subtle px-4 py-2.5 text-sm font-medium text-gn-text-secondary transition hover:bg-white/[0.06] hover:text-gn-text sm:inline-flex sm:w-auto";

const dashboardFeedSlideClass =
  "min-h-[20rem] w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black sm:min-h-[24rem]";

type LoadSlice<T> = {
  loading: boolean;
  error: string | null;
  data: T;
};

const initialSlice = <T,>(empty: T): LoadSlice<T> => ({
  loading: true,
  error: null,
  data: empty,
});

function SectionFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${sectionCardClass} p-4 sm:p-5`}>
      <h2 className="mb-4 break-words text-lg font-semibold tracking-tight text-gn-text">
        {title}
      </h2>
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  );
}

function isEmptySliceData<T>(data: T): boolean {
  if (Array.isArray(data)) return data.length === 0;
  return data == null;
}

function SliceBody<T>({
  slice,
  emptyLabel,
  emptyState,
  friendlyError,
  children,
}: {
  slice: LoadSlice<T>;
  emptyLabel?: string;
  emptyState?: {
    title: string;
    body: string;
    ctaHref?: string;
    ctaLabel?: string;
  };
  friendlyError: string;
  children: (data: T) => React.ReactNode;
}) {
  if (slice.loading) {
    return (
      <div className="space-y-2">
        <div className="h-10 animate-pulse rounded-xl bg-gn-bg/50" />
        <div className="h-10 animate-pulse rounded-xl bg-gn-bg/50" />
        <div className="h-10 animate-pulse rounded-xl bg-gn-bg/50" />
      </div>
    );
  }
  if (slice.error) {
    return (
      <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {friendlyError}
      </p>
    );
  }
  if (isEmptySliceData(slice.data)) {
    if (emptyState) {
      return (
        <div
          className={`${SCOUT_DASHBOARD_SECTION_CLASS} rounded-xl border border-gn-border-subtle bg-gn-bg/20 px-4 py-8 text-center`}
        >
          <p className="break-words text-sm font-medium text-gn-text">{emptyState.title}</p>
          <p className="mt-2 break-words text-sm text-gn-text-secondary">{emptyState.body}</p>
          {emptyState.ctaHref && emptyState.ctaLabel ? (
            <Link href={emptyState.ctaHref} className={`${scoutPrimaryCtaClass} mt-6`}>
              {emptyState.ctaLabel}
            </Link>
          ) : null}
        </div>
      );
    }
    return (
      <p className="text-sm text-gn-text-secondary">{emptyLabel ?? ""}</p>
    );
  }
  return <>{children(slice.data)}</>;
}

function PlayerRowMeta({
  profile,
  extra,
}: {
  profile: ScoutSavedPlayerDashboardRow["profile"];
  extra?: React.ReactNode;
}) {
  const t = useTranslations("scoutDashboard");
  const name =
    profile.full_name?.trim() ||
    profile.username?.trim() ||
    t("unknownPlayer");
  const username = profile.username?.trim() || t("noUsername");
  const age =
    profile.age != null && Number.isFinite(profile.age)
      ? String(profile.age)
      : t("dash");
  const position = profile.position?.trim() || t("dash");
  const country = profile.country?.trim() || t("dash");
  const club = profile.club?.trim() || t("dash");

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="font-medium text-gn-text">{name}</p>
        <p className="text-sm text-gn-text-secondary">@{username}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gn-text-secondary sm:grid-cols-4">
          <div>
            <dt className="text-gn-text-tertiary">{t("colAge")}</dt>
            <dd className="text-gn-text-secondary">{age}</dd>
          </div>
          <div>
            <dt className="text-gn-text-tertiary">{t("colPosition")}</dt>
            <dd className="text-gn-text-secondary">{position}</dd>
          </div>
          <div>
            <dt className="text-gn-text-tertiary">{t("colCountry")}</dt>
            <dd className="text-gn-text-secondary">{country}</dd>
          </div>
          <div>
            <dt className="text-gn-text-tertiary">{t("colClub")}</dt>
            <dd className="text-gn-text-secondary">{club}</dd>
          </div>
        </dl>
      </div>
      {extra ? (
        <div className="flex shrink-0 flex-col items-end gap-2">{extra}</div>
      ) : null}
    </div>
  );
}

export function ScoutDashboardView() {
  return (
    <>
      <ScoutDashboardOverflowDebug />
      <ScoutDashboardBody />
    </>
  );
}

function ScoutDashboardBody() {
  const t = useTranslations("scoutDashboard");
  const th = useTranslations("homeFeed");
  const tCommon = useTranslations("authCommon");
  const { loaded, userId, isApprovedScout } = useScoutVerification();

  const [saved, setSaved] = useState<LoadSlice<ScoutSavedPlayerDashboardRow[]>>(
    () => initialSlice([]),
  );
  const [contacts, setContacts] = useState<LoadSlice<ScoutRecentContactRow[]>>(
    () => initialSlice([]),
  );
  const [suggested, setSuggested] = useState<LoadSlice<AugmentedHomeFeedItem[]>>(
    () => initialSlice([]),
  );

  const loadDashboard = useCallback(async () => {
    if (!userId || !isApprovedScout) return;

    setSaved((s) => ({ ...s, loading: true, error: null }));
    setContacts((s) => ({ ...s, loading: true, error: null }));
    setSuggested((s) => ({ ...s, loading: true, error: null }));

    const [savedRes, contactsRes, suggestedRes] = await Promise.all([
      fetchScoutSavedPlayersForDashboard(supabase, userId),
      fetchScoutRecentContacts(supabase, userId, 12),
      fetchScoutSuggestedTalents(supabase),
    ]);

    if (savedRes.error) {
      logFullSupabaseError(
        "[scout dashboard] saved players",
        new Error(savedRes.error),
        { userId },
      );
    }
    if (contactsRes.error) {
      logFullSupabaseError(
        "[scout dashboard] contacts",
        new Error(contactsRes.error),
        { userId },
      );
    }
    if (suggestedRes.error) {
      logFullSupabaseError(
        "[scout dashboard] suggested",
        new Error(suggestedRes.error),
      );
    }

    setSaved({
      loading: false,
      error: savedRes.error,
      data: savedRes.rows,
    });
    setContacts({
      loading: false,
      error: contactsRes.error,
      data: contactsRes.rows,
    });
    setSuggested({
      loading: false,
      error: suggestedRes.error,
      data: suggestedRes.items,
    });
  }, [userId, isApprovedScout]);

  useEffect(() => {
    if (!loaded || !userId || !isApprovedScout) return;
    void loadDashboard();
  }, [loaded, userId, isApprovedScout, loadDashboard]);

  if (!loaded) {
    return (
      <div className={`${dashboardContentClass} space-y-6 pb-10`}>
        <div className="h-9 w-48 animate-pulse rounded-lg bg-gn-surface/50" />
        <div className="h-40 animate-pulse rounded-2xl bg-gn-surface/40" />
        <div className="h-40 animate-pulse rounded-2xl bg-gn-surface/40" />
      </div>
    );
  }

  if (!isApprovedScout) {
    return (
      <div className={`${dashboardContentClass} space-y-6 pb-10`}>
        <h1 className="break-words text-2xl font-semibold tracking-tight text-gn-text">
          {t("accessDeniedTitle")}
        </h1>
        <p className="break-words text-sm text-gn-text-secondary">{t("accessDeniedBody")}</p>
        <div className="flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/scout-apply" className={scoutPrimaryCtaClass}>
            {t("applyCta")}
          </Link>
          <Link href="/home" className={scoutSecondaryCtaClass}>
            {t("backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={dashboardContentClass}>
      <header className="flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-gn-text">
              {t("pageTitle")}
            </h1>
            <VerifiedScoutBadge withTooltip={false} className="shrink-0" />
          </div>
          <p className="mt-1 break-words text-sm text-gn-text-secondary">{t("pageSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="box-border w-full min-w-0 max-w-full shrink-0 rounded-xl border border-gn-border-subtle px-3 py-2 text-sm font-medium text-gn-text-secondary transition hover:bg-white/[0.06] hover:text-gn-text sm:w-auto"
        >
          {t("refresh")}
        </button>
      </header>

      <SectionFrame title={t("savedTitle")}>
        <SliceBody
          slice={saved}
          friendlyError={tCommon("genericError")}
          emptyState={{
            title: t("savedEmptyTitle"),
            body: t("savedEmptyBody"),
            ctaHref: "/discover",
            ctaLabel: t("discoverPlayersCta"),
          }}
        >
          {(rows: ScoutSavedPlayerDashboardRow[]) => (
            <ul className="min-w-0 max-w-full divide-y divide-gn-border-subtle">
              {rows.map((row) => (
                <li key={row.playerUserId} className="py-1">
                  <Link
                    href={playerProfileHref(row.profile)}
                    className="block min-w-0 max-w-full rounded-xl px-1 transition hover:bg-white/[0.04]"
                  >
                    <PlayerRowMeta
                      profile={row.profile}
                      extra={
                        row.maxAiOverall != null ? (
                          <span
                            className="rounded-lg bg-gn-accent/20 px-2.5 py-1 text-xs font-bold tabular-nums text-gn-accent ring-1 ring-gn-accent/30"
                            title={th("scoutAiBadgeTitle")}
                          >
                            {th("scoutAiScore", {
                              score: Math.round(row.maxAiOverall),
                            })}
                          </span>
                        ) : (
                          <span className="rounded-lg border border-gn-border-subtle px-2.5 py-1 text-xs font-medium text-gn-text-tertiary">
                            {th("scoutAiPending")}
                          </span>
                        )
                      }
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SliceBody>
      </SectionFrame>

      <SectionFrame title={t("contactsTitle")}>
        <SliceBody
          slice={contacts}
          friendlyError={tCommon("genericError")}
          emptyLabel={t("contactsEmpty")}
        >
          {(rows: ScoutRecentContactRow[]) => (
            <ul className="min-w-0 max-w-full space-y-1">
              {rows.map((row) => (
                <li key={row.playerUserId}>
                  <Link
                    href={playerProfileHref(row.profile)}
                    className="flex min-w-0 max-w-full items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gn-text">
                        {row.profile.full_name?.trim() ||
                          row.profile.username?.trim() ||
                          t("unknownPlayer")}
                      </p>
                      <p className="truncate text-sm text-gn-text-secondary">
                        @{row.profile.username?.trim() || t("noUsername")}
                      </p>
                    </div>
                    <time
                      className="shrink-0 text-xs text-gn-text-tertiary tabular-nums"
                      dateTime={row.lastMessageAt}
                    >
                      {new Date(row.lastMessageAt).toLocaleDateString()}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SliceBody>
      </SectionFrame>

      <SectionFrame title={t("suggestedTitle")}>
        <SliceBody
          slice={suggested}
          friendlyError={tCommon("genericError")}
          emptyLabel={t("suggestedEmpty")}
        >
          {(items: AugmentedHomeFeedItem[]) => (
            <HomeFeedSoundProvider
              bootstrapActiveVideoId={
                items.length > 0 ? feedItemVideoKey(items[0]) : null
              }
            >
              <div className="flex min-w-0 max-w-full flex-col gap-6 overflow-x-clip">
                {items.map((item, i) => (
                  <div key={item.video.id ?? `${item.video.user_id}-${i}`} className="min-w-0 max-w-full">
                    <FeedItemCard
                      item={item}
                      slideClassName={dashboardFeedSlideClass}
                    />
                  </div>
                ))}
              </div>
            </HomeFeedSoundProvider>
          )}
        </SliceBody>
      </SectionFrame>

      <SectionFrame title={t("sprint20mTopTitle")}>
        <div className={`${SCOUT_DASHBOARD_SECTION_CLASS} rounded-xl border border-gn-border-subtle bg-gn-bg/20 px-4 py-4`}>
          <p className="break-words text-sm text-gn-text-secondary">{t("sprint20mTopBody")}</p>
          <Link href="/challenges/sprint-20m-challenge" className={`${scoutPrimaryCtaClass} mt-4`}>
            {t("sprint20mTopCta")}
          </Link>
        </div>
      </SectionFrame>
    </div>
  );
}
