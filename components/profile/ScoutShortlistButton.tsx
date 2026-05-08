"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { useAppFeedback } from "@/components/feedback/FeedbackProvider";
import {
  fetchScoutHasPlayerShortlisted,
  shortlistAddPlayer,
  shortlistRemovePlayer,
} from "@/lib/supabase/scoutShortlist";

const SAVED_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-[0_8px_28px_-8px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/20 transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-gn-smooth hover:border-emerald-400/70 hover:bg-emerald-500/18 hover:shadow-[0_12px_36px_-10px_rgba(16,185,129,0.45)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg disabled:pointer-events-none disabled:opacity-45";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      className="size-5 shrink-0"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 20V5a2 2 0 012-2h8a2 2 0 012 2v15l-6-3-6 3z"
      />
    </svg>
  );
}

function InlineSpinner() {
  return (
    <svg
      className="size-4 shrink-0 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-30"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}

type Props = {
  scoutUserId: string;
  playerUserId: string;
};

export function ScoutShortlistButton({ scoutUserId, playerUserId }: Props) {
  const t = useTranslations("playerProfile.shortlist");
  const { showError } = useAppFeedback();
  const tErr = useTranslations("errors");

  const [saved, setSaved] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshSaved = useCallback(async () => {
    setLoadError(null);
    const { saved: isSaved, error } = await fetchScoutHasPlayerShortlisted(
      supabase,
      scoutUserId,
      playerUserId,
    );
    if (error) {
      logFullSupabaseError(
        "[ScoutShortlistButton] fetch saved state",
        new Error(error),
        { scoutUserId, playerUserId },
      );
      setLoadError("1");
      setSaved(null);
      return;
    }
    setSaved(isSaved);
  }, [scoutUserId, playerUserId]);

  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved]);

  async function onToggle() {
    if (saved === null || busy) return;
    setActionError(null);
    setBusy(true);
    try {
      if (saved) {
        const res = await shortlistRemovePlayer(supabase, scoutUserId, playerUserId);
        if (!res.ok) {
          logFullSupabaseError(
            "[ScoutShortlistButton] remove",
            new Error(res.error),
            { scoutUserId, playerUserId },
          );
          setActionError(tErr("generic"));
          showError(tErr("generic"));
          return;
        }
        setSaved(false);
      } else {
        const res = await shortlistAddPlayer(supabase, scoutUserId, playerUserId);
        if (!res.ok) {
          logFullSupabaseError(
            "[ScoutShortlistButton] add",
            new Error(res.error),
            { scoutUserId, playerUserId },
          );
          setActionError(tErr("generic"));
          showError(tErr("generic"));
          return;
        }
        setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loadError && saved === null) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gn-text-tertiary" role="status">
          {t("loadStateError")}
        </p>
        <button
          type="button"
          onClick={() => void refreshSaved()}
          className="text-xs font-medium text-gn-accent underline"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (saved === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-gn-text-tertiary">
        <InlineSpinner />
        {t("loading")}
      </div>
    );
  }

  const isSaved = saved;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onToggle()}
        disabled={busy}
        aria-busy={busy}
        aria-pressed={isSaved}
        className={isSaved ? SAVED_BUTTON_CLASS : GN_PRIMARY_BUTTON_CLASS}
      >
        {busy ? <InlineSpinner /> : <BookmarkIcon filled={isSaved} />}
        {busy
          ? t("working")
          : isSaved
            ? t("removeFromShortlist")
            : t("saveToShortlist")}
      </button>
      {actionError ? (
        <p className="text-xs text-red-300/90" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
