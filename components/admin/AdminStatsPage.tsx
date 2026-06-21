"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  fetchAdminPlatformStats,
  type AdminPlatformStats,
} from "@/lib/supabase/adminSystem";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="tabular-nums text-zinc-400">
          {value}
          {suffix ? ` ${suffix}` : ""}
          <span className="text-zinc-600"> · {pct}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-orange-500/70"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

const PROFILE_FIELD_KEYS = [
  "full_name",
  "username",
  "age",
  "bio",
  "position",
  "preferred_foot",
  "height",
  "weight",
  "city",
  "country",
  "club",
] as const;

export function AdminStatsPage() {
  const t = useTranslations("adminDashboard");
  const format = useFormatter();
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminPlatformStats();
    if (res.error) {
      setError(res.error);
      setStats(null);
    } else {
      setStats(res.stats);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const profileTotal = stats?.profiles.player_profiles ?? 0;
  const completePct = useMemo(() => {
    if (!stats || profileTotal === 0) return 0;
    return Math.round(
      (stats.profiles.complete_profiles / profileTotal) * 100,
    );
  }, [stats, profileTotal]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-400">
        {t("statsLoading")}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">{t("statsTitle")}</h1>
        <p className="text-sm text-red-300">{error ?? t("statsLoadError")}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-orange-500/20 px-4 py-2 text-sm font-medium text-orange-200 hover:bg-orange-500/30"
        >
          {t("statsRetry")}
        </button>
      </div>
    );
  }

  const generatedAt = stats.generated_at
    ? format.dateTime(new Date(stats.generated_at), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {t("statsTitle")}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{t("statsIntro")}</p>
        </div>
        <div className="flex items-center gap-2">
          {generatedAt ? (
            <p className="text-xs text-zinc-500">
              {t("statsUpdatedAt", { time: generatedAt })}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
          >
            {t("statsRefresh")}
          </button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-300/90">
          {t("statsSectionUsers")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("statsUsersTotal")} value={stats.users.total} />
          <StatCard label={t("statsUsersPlayers")} value={stats.users.players} />
          <StatCard label={t("statsUsersScouts")} value={stats.users.scouts} />
          <StatCard label={t("statsUsersPremium")} value={stats.users.premium} />
          <StatCard
            label={t("statsUsersSignups7d")}
            value={stats.users.signups_7d}
          />
          <StatCard
            label={t("statsUsersSignups30d")}
            value={stats.users.signups_30d}
          />
          <StatCard
            label={t("statsUsersSuspended")}
            value={stats.users.suspended}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-300/90">
          {t("statsSectionProfiles")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("statsProfilesTotal")}
            value={stats.profiles.player_profiles}
          />
          <StatCard
            label={t("statsProfilesComplete")}
            value={stats.profiles.complete_profiles}
            hint={t("statsProfilesCompleteHint", { pct: completePct })}
          />
          <StatCard
            label={t("statsProfilesWithAvatar")}
            value={stats.profiles.with_avatar}
          />
          <StatCard
            label={t("statsProfilesWithVideo")}
            value={stats.profiles.with_video}
          />
          <StatCard
            label={t("statsProfilesWithAi")}
            value={stats.profiles.with_ai_analysis}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <h3 className="text-sm font-medium text-zinc-200">
            {t("statsCompletenessBuckets")}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {t("statsCompletenessBucketsHint")}
          </p>
          <div className="mt-4 space-y-3">
            {stats.profiles.completeness_buckets.map((b) => (
              <BarRow
                key={b.score}
                label={t("statsCompletenessScore", { score: b.score })}
                value={b.count}
                max={profileTotal}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <h3 className="text-sm font-medium text-zinc-200">
            {t("statsFieldFill")}
          </h3>
          <div className="mt-4 space-y-3">
            {PROFILE_FIELD_KEYS.map((key) => (
              <BarRow
                key={key}
                label={t(`statsField_${key}`)}
                value={stats.profiles.field_fill[key] ?? 0}
                max={profileTotal}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-300/90">
          {t("statsSectionUsage")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("statsVideosTotal")}
            value={stats.usage.videos_total}
            hint={t("statsVideosRecent", {
              d7: stats.usage.videos_7d,
              d30: stats.usage.videos_30d,
            })}
          />
          <StatCard
            label={t("statsUploaders")}
            value={stats.usage.uploaders}
          />
          <StatCard
            label={t("statsAiTotal")}
            value={stats.usage.ai_analyses_total}
            hint={t("statsAiRecent", {
              valid: stats.usage.ai_analyses_valid,
              d7: stats.usage.ai_analyses_7d,
              users: stats.usage.ai_users,
            })}
          />
          <StatCard
            label={t("statsMessagesTotal")}
            value={stats.usage.messages_total}
            hint={t("statsMessagesRecent", {
              d7: stats.usage.messages_7d,
              users: stats.usage.message_users,
            })}
          />
          <StatCard label={t("statsLikesTotal")} value={stats.usage.likes_total} />
          <StatCard
            label={t("statsCommentsTotal")}
            value={stats.usage.comments_total}
          />
          <StatCard
            label={t("statsFollowsTotal")}
            value={stats.usage.follows_total}
          />
          <StatCard
            label={t("statsChallengeEntries")}
            value={stats.usage.challenge_entries_total}
          />
          <StatCard
            label={t("statsWeeklySubmissions")}
            value={stats.usage.weekly_submissions_total}
          />
          <StatCard
            label={t("statsFriendChallenges")}
            value={stats.usage.friend_challenges_total}
          />
          <StatCard
            label={t("statsQuizAnswers")}
            value={stats.usage.quiz_answers_total}
            hint={t("statsQuizRecent", { d7: stats.usage.quiz_users_7d })}
          />
          <StatCard
            label={t("statsReferrals")}
            value={stats.usage.referrals_total}
          />
          <StatCard
            label={t("statsScoutSaves")}
            value={stats.usage.scout_saves_total}
          />
          <StatCard
            label={t("statsWelcomeMessages")}
            value={stats.usage.welcome_messages_sent}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-300/90">
          {t("statsSectionOps")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label={t("statsOpenSupport")}
            value={stats.operations.open_support_tickets}
          />
          <StatCard
            label={t("statsOpenModeration")}
            value={stats.operations.open_moderation_reports}
          />
          <StatCard
            label={t("statsPendingScouts")}
            value={stats.operations.pending_scout_verifications}
          />
        </div>
      </section>
    </div>
  );
}
