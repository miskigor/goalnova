"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useNavSession } from "@/components/layout/useNavSession";

/**
 * Shown on public explore/challenges when the user is not in the logged-in app shell.
 * Hidden once {@link useNavSession} reports an authenticated session.
 */
export function GuestPublicCallout() {
  const { authed } = useNavSession();
  const t = useTranslations("publicGuest");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authed !== false) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-4 box-border w-full min-w-0 max-w-full overflow-x-clip rounded-2xl border border-gn-accent/25 bg-gn-accent/[0.08] px-3 py-3 sm:mb-5 sm:px-4 sm:py-4"
    >
      <p className="text-sm leading-snug text-gn-text sm:text-[0.9375rem]">
        {t("banner")}
      </p>
      <div className="mt-3 flex w-full min-w-0 max-w-full flex-wrap items-center gap-2">
        <Link
          href="/login"
          className="inline-flex min-h-10 max-w-full min-w-0 items-center justify-center rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-gn-bg shadow-[0_8px_28px_-10px_rgba(249,115,22,0.45)] transition-[background-color,box-shadow,transform] duration-300 ease-gn-smooth hover:bg-gn-accent-hover motion-safe:active:scale-[0.99]"
        >
          {t("signIn")}
        </Link>
        <Link
          href="/signup"
          className="inline-flex min-h-10 max-w-full min-w-0 items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-4 py-2 text-sm font-semibold text-gn-text transition-colors hover:bg-gn-surface-elevated"
        >
          {t("signUp")}
        </Link>
      </div>
    </div>
  );
}
