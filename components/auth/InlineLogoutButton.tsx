"use client";

import { useCallback, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { devError } from "@/lib/devLog";
import { signOut } from "@/lib/supabase/auth";
import { useAppFeedback } from "@/components/feedback/FeedbackProvider";

type Props = {
  className?: string;
};

const defaultClassName =
  "flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium text-gn-text-secondary transition-colors hover:bg-white/[0.06] hover:text-gn-text disabled:pointer-events-none disabled:opacity-50";

/**
 * Text-style logout (e.g. under language switcher). Same behavior as {@link NavUserMenu} logout.
 */
export function InlineLogoutButton({ className = defaultClassName }: Props) {
  const router = useRouter();
  const tAuth = useTranslations("authCommon");
  const tErr = useTranslations("errors");
  const { showError } = useAppFeedback();
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch (e) {
      devError("Inline logout error:", e);
      showError(tErr("generic"));
    } finally {
      setBusy(false);
    }
  }, [busy, router, showError, tErr]);

  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy}
      onClick={() => void onClick()}
      className={className}
    >
      {busy ? tAuth("loading") : tAuth("logout")}
    </button>
  );
}
