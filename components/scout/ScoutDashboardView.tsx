"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
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
import { isDev } from "@/lib/devLog";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";
import { fetchUserAvatarUrlsByUserIds } from "@/lib/supabase/homeFeed";
import { ExploreVideoCard } from "@/components/explore/ExploreView";
import type { ExploreFeedItem } from "@/lib/supabase/exploreFeed";
import { VerifiedScoutBadge } from "@/components/scout/VerifiedScoutBadge";
import { ScoutDashboardOverflowDebug } from "@/components/scout/ScoutDashboardOverflowDebug";
import { ScoutMobileLayoutCheck } from "@/components/scout/ScoutMobileLayoutCheck";
import { SCOUT_DASHBOARD_SECTION_CLASS } from "@/lib/layout/appShellClasses";
import {
  SCOUT_MOBILE_BODY_CLASS,
  SCOUT_MOBILE_CARD_HINT_CLASS,
  SCOUT_MOBILE_CARD_META_CLASS,
  SCOUT_MOBILE_CARD_NAME_CLASS,
  SCOUT_MOBILE_PAGE_SUBTITLE_CLASS,
  SCOUT_MOBILE_PAGE_TITLE_CLASS,
  SCOUT_MOBILE_SECTION_TITLE_CLASS,
  SCOUT_MOBILE_TAB_CLASS,
} from "@/components/scout/scoutMobileTypography";
import { scheduleMlv2ScrollReset } from "@/lib/layout/mlv2ScrollReset";
import { formatPlayerPositionLabel } from "@/lib/profile/formatPlayerPositionLabel";

const dashboardContentClass =
  "box-border w-full min-w-0 max-w-full space-y-4 overflow-x-clip";

const tabPanelClass = `${SCOUT_DASHBOARD_SECTION_CLASS} min-w-0 max-w-full overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4 shadow-sm backdrop-blur-sm sm:p-5`;

const scoutPrimaryCtaClass = `${GN_PRIMARY_BUTTON_CLASS} box-border flex w-full min-w-0 max-w-full items-center justify-center truncate py-3.5 shadow-none sm:inline-flex sm:w-auto sm:shadow-[0_8px_28px_-6px_rgba(249,115,22,0.45)]`;

const scoutSecondaryCtaClass =
  "box-border flex w-full min-w-0 max-w-full items-center justify-center truncate rounded-xl border border-gn-border-subtle px-4 py-2.5 text-sm font-medium text-gn-text-secondary transition hover:bg-white/[0.06] hover:text-gn-text sm:inline-flex sm:w-auto";

const SCOUT_DASHBOARD_TABS = ["videos", "saved", "contacts", "search"] as const;
type ScoutDashboardTab = (typeof SCOUT_DASHBOARD_TABS)[number];

function resolveScoutDashboardTab(
  searchParams: Pick<URLSearchParams, "get">,
): ScoutDashboardTab {
  const tab = searchParams.get("tab");
  if (
    tab === "videos" ||
    tab === "saved" ||
    tab === "contacts" ||
    tab === "search"
  ) {
    return tab;
  }
  if (searchParams.get("section") === "saved") return "saved";
  return "videos";
}

function scoutDashboardTabHref(
  tab: ScoutDashboardTab,
): "/scout-dashboard" | `/scout-dashboard?tab=${Exclude<ScoutDashboardTab, "videos">}` {
  if (tab === "videos") return "/scout-dashboard";
  return `/scout-dashboard?tab=${tab}`;
}

function augmentedToExploreItem(item: AugmentedHomeFeedItem): ExploreFeedItem {
  return {
    video: item.video as ExploreFeedItem["video"],
    profile: item.profile
      ? ({
          id: item.profile.id,
          full_name: item.profile.full_name,
          username: item.profile.username,
          age: item.profile.age,
          bio: item.profile.bio,
          position: item.profile.position,
          preferred_foot: item.profile.preferred_foot,
          height: item.profile.height,
          weight: item.profile.weight,
          city: item.profile.city,
          country: item.profile.country,
          club: item.profile.club,
          avatar_url: null,
        } as ExploreFeedItem["profile"])
      : null,
    userAvatarUrl: item.userAvatarUrl,
    likeCount: item.scoutMetrics?.likesCount ?? 0,
    challenge: item.challenge,
    aiOverallScore: item.scoutMetrics?.aiOverallScore ?? null,
  };
}

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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-xl bg-gn-bg/50" />
        <div className="h-36 animate-pulse rounded-xl bg-gn-bg/50" />
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
          <p className={`break-words font-medium text-gn-text ${SCOUT_MOBILE_BODY_CLASS}`}>{emptyState.title}</p>
          <p className={`mt-2 break-words ${SCOUT_MOBILE_BODY_CLASS}`}>{emptyState.body}</p>
          {emptyState.ctaHref && emptyState.ctaLabel ? (
            <Link href={emptyState.ctaHref} className={`${scoutPrimaryCtaClass} mt-6`}>
              {emptyState.ctaLabel}
            </Link>
          ) : null}
        </div>
      );
    }
    return (
      <p className={SCOUT_MOBILE_BODY_CLASS}>{emptyLabel ?? ""}</p>
    );
  }
  return <>{children(slice.data)}</>;
}

function ScoutDashboardVideoCard({ item }: { item: ExploreFeedItem }) {
  const tPos = useTranslations("profileEditor");
  const th = useTranslations("homeFeed");
  const profile = item.profile;
  const displayName =
    profile?.full_name?.trim() || profile?.username?.trim() || null;
  const position = formatPlayerPositionLabel(profile?.position, tPos, "");
  const aiScore = item.aiOverallScore;

  return (
    <article className="box-border flex min-w-0 max-w-full flex-col overflow-hidden">
      <ExploreVideoCard item={item} showChallengeTag={false} />
      <div className="box-border min-w-0 max-w-full space-y-1 px-1.5 pb-2 sm:px-2">
        {displayName ? (
          <p className={`truncate ${SCOUT_MOBILE_CARD_NAME_CLASS}`}>{displayName}</p>
        ) : null}
        {position ? (
          <p className={`truncate ${SCOUT_MOBILE_CARD_META_CLASS}`}>{position}</p>
        ) : null}
        {aiScore != null && Number.isFinite(aiScore) ? (
          <span
            className="inline-flex max-w-full truncate rounded-lg bg-gn-accent/20 px-2 py-0.5 text-xs font-bold tabular-nums text-gn-accent ring-1 ring-gn-accent/30"
            title={th("scoutAiBadgeTitle")}
          >
            {th("scoutAiScore", { score: Math.round(aiScore) })}
          </span>
        ) : (
          <span className={`block truncate ${SCOUT_MOBILE_CARD_HINT_CLASS}`}>
            {th("scoutAiPending")}
          </span>
        )}
      </div>
    </article>
  );
}

function SavedPlayerCard({ row }: { row: ScoutSavedPlayerDashboardRow }) {
  const t = useTranslations("scoutDashboard");
  const tPos = useTranslations("profileEditor");
  const profile = row.profile;
  const name =
    profile.full_name?.trim() ||
    profile.username?.trim() ||
    t("unknownPlayer");
  const username = profile.username?.trim() || t("noUsername");
  const age =
    profile.age != null && Number.isFinite(profile.age)
      ? String(profile.age)
      : t("dash");
  const position = formatPlayerPositionLabel(profile.position, tPos, t("dash"));
  const country = profile.country?.trim() || t("dash");
  const club = profile.club?.trim() || t("dash");

  return (
    <article className="box-border min-w-0 rounded-xl border border-gn-border-subtle bg-gn-surface p-4 shadow-sm">
      <Link
        href={playerProfileHref(profile)}
        className="block min-w-0 outline-none ring-gn-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg"
      >
        <h3 className={SCOUT_MOBILE_CARD_NAME_CLASS}>{name}</h3>
        <p className={`mt-0.5 ${SCOUT_MOBILE_CARD_META_CLASS}`}>@{username}</p>
      </Link>
      <dl className={`mt-3 grid gap-1.5 ${SCOUT_MOBILE_BODY_CLASS}`}>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-gn-text-tertiary">{t("colAge")}</dt>
          <dd>{age}</dd>
        </div>
        <div className="flex min-w-0 flex-wrap gap-x-2">
          <dt className="shrink-0 text-gn-text-tertiary">{t("colPosition")}</dt>
          <dd className="min-w-0 break-words">{position}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-gn-text-tertiary">{t("colCountry")}</dt>
          <dd>{country}</dd>
        </div>
        <div className="flex min-w-0 flex-wrap gap-x-2">
          <dt className="shrink-0 text-gn-text-tertiary">{t("colClub")}</dt>
          <dd className="min-w-0 break-words">{club}</dd>
        </div>
      </dl>
    </article>
  );
}

function ScoutDashboardTabs({
  activeTab,
}: {
  activeTab: ScoutDashboardTab;
}) {
  const t = useTranslations("scoutDashboard");

  const tabs: { id: ScoutDashboardTab; label: string }[] = [
    { id: "videos", label: t("tabVideos") },
    { id: "saved", label: t("tabSaved") },
    { id: "contacts", label: t("tabContacts") },
    { id: "search", label: t("tabSearch") },
  ];

  return (
    <nav
      className="box-border min-w-0 max-w-full overflow-x-clip"
      aria-label={t("tabsAria")}
    >
      <ul className="flex min-w-0 max-w-full flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <li key={tab.id} className="min-w-0 shrink-0">
              <Link
                href={scoutDashboardTabHref(tab.id)}
                aria-current={active ? "page" : undefined}
                className={[
                  SCOUT_MOBILE_TAB_CLASS,
                  active
                    ? "border-gn-accent/40 bg-gn-accent/15 text-gn-accent"
                    : "border-gn-border-subtle bg-gn-surface/30 text-gn-text-secondary hover:border-gn-border-subtle hover:bg-gn-surface/50 hover:text-gn-text",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ScoutDashboardView() {
  return (
    <>
      <ScoutMobileLayoutCheck />
      <ScoutDashboardOverflowDebug />
      <ScoutDashboardBody />
    </>
  );
}

function ScoutDashboardBody() {
  const pathname = usePathname() ?? "/scout-dashboard";
  const searchParams = useSearchParams();
  const activeTab = useMemo(
    () => resolveScoutDashboardTab(searchParams),
    [searchParams],
  );
  const t = useTranslations("scoutDashboard");
  const tCommon = useTranslations("authCommon");
  const { loaded, userId, isApprovedScout } = useScoutVerification();

  useLayoutEffect(() => {
    if (!loaded) return;
    return scheduleMlv2ScrollReset(pathname);
  }, [loaded, pathname]);

  const [saved, setSaved] = useState<LoadSlice<ScoutSavedPlayerDashboardRow[]>>(
    () => initialSlice([]),
  );
  const [contacts, setContacts] = useState<LoadSlice<ScoutRecentContactRow[]>>(
    () => initialSlice([]),
  );
  const [suggested, setSuggested] = useState<LoadSlice<ExploreFeedItem[]>>(
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

    if (isDev) {
      const d = savedRes.debug;
      console.warn("[Scout saved players debug]", {
        sessionUserId: d.sessionUserId,
        effectiveScoutUserId: d.effectiveScoutUserId,
        savedRowsCount: d.savedRowsCount,
        savedRows: d.savedRows,
        playerIds: d.playerIds,
        profilesCount: d.profilesCount,
        missingProfileIds: d.missingProfileIds,
        finalRowsCount: d.finalRowsCount,
        errors: d.errors,
        passedScoutUserId: d.passedScoutUserId,
        scoutUserIdMatchesSession: d.scoutUserIdMatchesSession,
        usersRowsCount: d.usersRowsCount,
        deletedPlayerIds: d.deletedPlayerIds,
        livePlayerIds: d.livePlayerIds,
      });
    }

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

    let exploreItems = suggestedRes.items.map(augmentedToExploreItem);
    const avatarUserIds = [
      ...new Set(
        suggestedRes.items.map((item) => item.video.user_id).filter(Boolean),
      ),
    ];
    if (avatarUserIds.length > 0) {
      const avatarMap = await fetchUserAvatarUrlsByUserIds(supabase, avatarUserIds);
      exploreItems = exploreItems.map((item) => ({
        ...item,
        userAvatarUrl: avatarMap.get(item.video.user_id) ?? item.userAvatarUrl,
      }));
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
      data: exploreItems,
    });
  }, [userId, isApprovedScout]);

  useEffect(() => {
    if (!loaded || !userId || !isApprovedScout) return;
    void loadDashboard();
  }, [loaded, userId, isApprovedScout, loadDashboard]);

  if (!loaded) {
    return (
      <div className={`${dashboardContentClass} space-y-6`}>
        <div className="h-9 w-48 animate-pulse rounded-lg bg-gn-surface/50" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-gn-surface/40" />
        <div className="h-40 animate-pulse rounded-2xl bg-gn-surface/40" />
      </div>
    );
  }

  if (!isApprovedScout) {
    return (
      <div className={`${dashboardContentClass} space-y-6`}>
        <h1 className={SCOUT_MOBILE_PAGE_TITLE_CLASS}>
          {t("accessDeniedTitle")}
        </h1>
        <p className={SCOUT_MOBILE_BODY_CLASS}>{t("accessDeniedBody")}</p>
        <div className="flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/scout-apply" className={scoutPrimaryCtaClass}>
            {t("applyCta")}
          </Link>
          <Link href="/discover" className={scoutSecondaryCtaClass}>
            {t("discoverPlayersCta")}
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
            <h1 className={SCOUT_MOBILE_PAGE_TITLE_CLASS}>
              {t("pageTitle")}
            </h1>
            <VerifiedScoutBadge withTooltip={false} className="shrink-0" />
          </div>
          <p className={`mt-1 break-words ${SCOUT_MOBILE_PAGE_SUBTITLE_CLASS}`}>{t("pageSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="box-border w-full min-w-0 max-w-full shrink-0 rounded-xl border border-gn-border-subtle px-3 py-2 text-sm font-medium text-gn-text-secondary transition hover:bg-white/[0.06] hover:text-gn-text sm:w-auto"
        >
          {t("refresh")}
        </button>
      </header>

      <ScoutDashboardTabs activeTab={activeTab} />

      {activeTab === "videos" ? (
        <section className={tabPanelClass} aria-labelledby="scout-tab-videos">
          <h2 id="scout-tab-videos" className="sr-only">
            {t("tabVideos")}
          </h2>
          <SliceBody
            slice={suggested}
            friendlyError={tCommon("genericError")}
            emptyState={{
              title: t("suggestedEmpty"),
              body: t("savedEmptyBody"),
              ctaHref: "/discover",
              ctaLabel: t("discoverPlayersCta"),
            }}
          >
            {(items: ExploreFeedItem[]) => (
              <ul className="box-border grid w-full min-w-0 max-w-full grid-cols-[repeat(3,minmax(0,1fr))] gap-1 overflow-x-clip sm:gap-1.5 md:gap-2 lg:grid-cols-3 lg:gap-4">
                {items.map((item) => (
                  <li key={item.video.id ?? item.video.user_id} className="min-w-0">
                    <ScoutDashboardVideoCard item={item} />
                  </li>
                ))}
              </ul>
            )}
          </SliceBody>
        </section>
      ) : null}

      {activeTab === "saved" ? (
        <section
          id="scout-saved-players"
          className={tabPanelClass}
          aria-labelledby="scout-tab-saved"
        >
          <h2 id="scout-tab-saved" className="sr-only">
            {t("tabSaved")}
          </h2>
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
              <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
                {rows.map((row) => (
                  <li key={row.playerUserId} className="min-w-0">
                    <SavedPlayerCard row={row} />
                  </li>
                ))}
              </ul>
            )}
          </SliceBody>
        </section>
      ) : null}

      {activeTab === "contacts" ? (
        <section className={tabPanelClass} aria-labelledby="scout-tab-contacts">
          <h2 id="scout-tab-contacts" className="sr-only">
            {t("tabContacts")}
          </h2>
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
                        <p className={SCOUT_MOBILE_CARD_NAME_CLASS}>
                          {row.profile.full_name?.trim() ||
                            row.profile.username?.trim() ||
                            t("unknownPlayer")}
                        </p>
                        <p className={`truncate ${SCOUT_MOBILE_CARD_META_CLASS}`}>
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
        </section>
      ) : null}

      {activeTab === "search" ? (
        <section className={tabPanelClass} aria-labelledby="scout-tab-search">
          <h2
            id="scout-tab-search"
            className={`mb-4 ${SCOUT_MOBILE_SECTION_TITLE_CLASS}`}
          >
            {t("detailedSearchTitle")}
          </h2>
          <p className={SCOUT_MOBILE_BODY_CLASS}>{t("detailedSearchBody")}</p>
          <Link href="/discover" className={`${scoutPrimaryCtaClass} mt-4`}>
            {t("detailedSearchCta")}
          </Link>
        </section>
      ) : null}
    </div>
  );
}
