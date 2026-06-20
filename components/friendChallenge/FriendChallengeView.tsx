"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { FriendChallengeLeaderboard } from "@/components/friendChallenge/FriendChallengeLeaderboard";
import { rememberFriendChallengeId } from "@/lib/friendChallenge/friendChallengeInviteStorage";
import { FRIEND_CHALLENGE_JOIN_BONUS_XP } from "@/lib/friendChallenge/friendChallengeConfig";
import {
  buildFriendChallengeShareUrl,
  rpcFriendChallengeAccept,
  rpcFriendChallengeGet,
  type FriendChallengePayload,
} from "@/lib/supabase/friendChallenges";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { supabase } from "@/lib/supabase/client";
import { useLocale } from "next-intl";

type Props = {
  challengeId: string;
};

export function FriendChallengeView({ challengeId }: Props) {
  const t = useTranslations("friendChallenges");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [payload, setPayload] = useState<FriendChallengePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: session } = await supabase.auth.getSession();
    setAuthed(Boolean(session.session?.user));
    const { data, error: loadErr } = await rpcFriendChallengeGet(challengeId);
    if (loadErr === "not_found" || !data) {
      setPayload(null);
      setError(loadErr ?? t("notFound"));
    } else {
      setPayload(data);
    }
    setLoading(false);
  }, [challengeId, t]);

  useEffect(() => {
    rememberFriendChallengeId(challengeId);
    void load();
  }, [challengeId, load]);

  useEffect(() => {
    if (payload?.status !== "active") return;
    const timer = window.setInterval(() => {
      void load();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [load, payload?.status]);

  async function onAccept() {
    setAccepting(true);
    setError(null);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      setAccepting(false);
      router.push(`/login?next=/challenge/${encodeURIComponent(challengeId)}`);
      return;
    }
    const { data, error: acceptErr } = await rpcFriendChallengeAccept(challengeId);
    setAccepting(false);
    if (acceptErr) {
      setError(acceptErr);
      return;
    }
    if (data) setPayload(data);
  }

  function onShareResult() {
    if (!payload) return;
    setShareBusy(true);
    const url =
      typeof window !== "undefined"
        ? buildFriendChallengeShareUrl(challengeId, window.location.origin, locale)
        : "";
    const winner = payload.players.find((p) => p.user_id === payload.winner_user_id);
    const text = t("shareResultText", {
      winner: winner?.display_name ?? t("unknownPlayer"),
      xp: winner?.total_xp ?? 0,
    });
    void (async () => {
      try {
        if (navigator.share) {
          await navigator.share({ title: "PitchRusch", text, url });
        } else if (url) {
          await navigator.clipboard.writeText(`${text}\n${url}`);
        }
      } catch {
        /* ignore */
      } finally {
        setShareBusy(false);
      }
    })();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-gn-text-secondary">
        <div className="size-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
        {t("loading")}
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-950/20 px-4 py-8 text-center">
        <p className="text-sm text-red-100">{t("errorTitle")}</p>
        <p className="mt-1 text-sm text-red-100/80">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!payload) return null;

  const challengerName =
    payload.challenger?.display_name?.trim() || t("unknownPlayer");
  const canAccept =
    payload.status === "pending" &&
    authed &&
    !payload.is_challenger &&
    payload.viewer_id;
  const showShareInvite = payload.status === "pending" && payload.is_challenger;
  const isCompleted = payload.status === "completed";
  const winner = payload.players.find((p) => p.user_id === payload.winner_user_id);

  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-lg space-y-6 overflow-x-clip px-4 py-8 pb-16">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gn-accent">
          {t("branding")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gn-text">{t("pageTitle")}</h1>
        <p className="text-sm text-gn-text-secondary">{t("pageSubtitle")}</p>
      </header>

      <section className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4 sm:p-5">
        {payload.status === "pending" ? (
          <div className="space-y-3">
            <p className="text-sm text-gn-text">
              {t("pendingInvite", { name: challengerName })}
            </p>
            <p className="text-xs text-gn-text-secondary">{t("joinBonusHint", { xp: FRIEND_CHALLENGE_JOIN_BONUS_XP })}</p>
          </div>
        ) : null}

        {payload.status === "active" && payload.start_date && payload.end_date ? (
          <p className="mb-4 text-sm text-gn-text-secondary">
            {t("activeDates", {
              start: payload.start_date,
              end: payload.end_date,
            })}
          </p>
        ) : null}

        {isCompleted && winner ? (
          <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
              {t("winnerBadge")}
            </p>
            <p className="mt-1 text-lg font-bold text-gn-text">{winner.display_name}</p>
            <p className="text-sm text-gn-text-secondary">
              {t("finalScore", { xp: winner.total_xp })}
            </p>
          </div>
        ) : null}

        <FriendChallengeLeaderboard
          players={payload.players}
          viewerId={payload.viewer_id}
          status={payload.status}
          winnerUserId={payload.winner_user_id}
        />

        {error ? (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          {!authed && payload.status === "pending" ? (
            <>
              <Link href="/signup" className={`${GN_PRIMARY_BUTTON_CLASS} justify-center text-center`}>
                {t("signUpToJoin")}
              </Link>
              <Link
                href={`/login?next=/challenge/${encodeURIComponent(challengeId)}`}
                className="text-center text-sm font-medium text-gn-accent hover:underline"
              >
                {t("logInToJoin")}
              </Link>
            </>
          ) : null}

          {canAccept ? (
            <button
              type="button"
              disabled={accepting}
              onClick={() => void onAccept()}
              className={`${GN_PRIMARY_BUTTON_CLASS} w-full justify-center py-3`}
            >
              {accepting ? t("joining") : t("acceptChallenge")}
            </button>
          ) : null}

          {showShareInvite ? (
            <button
              type="button"
              onClick={() => {
                const url = buildFriendChallengeShareUrl(
                  challengeId,
                  window.location.origin,
                  locale,
                );
                void navigator.clipboard.writeText(url);
              }}
              className={`${GN_PRIMARY_BUTTON_CLASS} w-full justify-center py-3`}
            >
              {t("copyInviteLink")}
            </button>
          ) : null}

          {isCompleted ? (
            <button
              type="button"
              disabled={shareBusy}
              onClick={onShareResult}
              className={`${GN_PRIMARY_BUTTON_CLASS} w-full justify-center py-3`}
            >
              {shareBusy ? t("sharing") : t("shareResult")}
            </button>
          ) : null}
        </div>
      </section>

      <p className="text-center text-xs text-gn-text-tertiary">{t("xpRulesHint")}</p>
    </div>
  );
}
