"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import {
  buildFriendChallengeShareUrl,
  rpcFriendChallengeCreate,
} from "@/lib/supabase/friendChallenges";
import { supabase } from "@/lib/supabase/client";

type Props = {
  className?: string;
  /** Compact row button vs full width */
  fullWidth?: boolean;
};

export function ChallengeFriendButton({ className = "", fullWidth = false }: Props) {
  const t = useTranslations("friendChallenges");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState(false);

  const shareUrl = useMemo(() => {
    if (!challengeId || typeof window === "undefined") return "";
    return buildFriendChallengeShareUrl(challengeId, window.location.origin, locale);
  }, [challengeId, locale]);

  const startChallenge = useCallback(async () => {
    setBusy(true);
    setError(null);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      setBusy(false);
      router.push("/login");
      return;
    }
    const { data, error: createErr } = await rpcFriendChallengeCreate();
    setBusy(false);
    if (createErr || !data?.id) {
      setError(createErr ?? t("createFailed"));
      return;
    }
    setChallengeId(data.id);
    setModalOpen(true);
  }, [router, t]);

  function onCopy() {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyHint(true);
      window.setTimeout(() => setCopyHint(false), 4000);
    });
  }

  function onShare() {
    if (!shareUrl) return;
    const payload = { title: "PitchRusch", text: t("shareInviteText"), url: shareUrl };
    void (async () => {
      try {
        if (navigator.share) {
          await navigator.share(payload);
        } else {
          onCopy();
        }
      } catch {
        /* cancelled */
      }
    })();
  }

  const btnClass = fullWidth
    ? `${GN_PRIMARY_BUTTON_CLASS} w-full min-h-11 justify-center ${className}`
    : `${GN_SECONDARY_BUTTON_CLASS} inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold ${className}`;

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => void startChallenge()}
        className={btnClass}
      >
        {busy ? t("creating") : t("challengeFriendCta")}
      </button>

      {error ? (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {modalOpen && challengeId ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="friend-challenge-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-gn-border-subtle bg-gn-surface p-5 shadow-xl">
            <h2
              id="friend-challenge-modal-title"
              className="text-lg font-semibold text-gn-text"
            >
              {t("inviteModalTitle")}
            </h2>
            <p className="mt-2 text-sm text-gn-text-secondary">{t("inviteModalBody")}</p>
            <p className="mt-3 break-all rounded-xl border border-gn-border-subtle bg-black/40 px-3 py-2 text-xs text-gn-text">
              {shareUrl}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onCopy}
                className={`${GN_PRIMARY_BUTTON_CLASS} flex-1 min-w-[8rem] justify-center py-2.5 text-sm`}
              >
                {copyHint ? t("copied") : t("copyLink")}
              </button>
              <button
                type="button"
                onClick={onShare}
                className={`${GN_SECONDARY_BUTTON_CLASS} flex-1 min-w-[8rem] justify-center py-2.5 text-sm`}
              >
                {t("shareLink")}
              </button>
            </div>
            <Link
              href={`/challenge/${challengeId}`}
              className="mt-3 block text-center text-sm font-medium text-gn-accent hover:underline"
              onClick={() => setModalOpen(false)}
            >
              {t("viewChallenge")}
            </Link>
            <button
              type="button"
              className="mt-4 w-full text-sm text-gn-text-secondary hover:text-gn-text"
              onClick={() => setModalOpen(false)}
            >
              {t("close")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
