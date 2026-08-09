"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/Logo";
import {
  isLikelyInAppBrowser,
  openInSystemBrowser,
} from "@/lib/auth/inAppBrowser";

type Props = {
  /** Shown when the user stays in the webview. */
  children: React.ReactNode;
  /** Absolute URL to open (defaults to current page). */
  targetHref?: string;
  className?: string;
};

/**
 * Instagram/TikTok visitors get one clear "Continue" tap that opens Safari/Chrome.
 * No need to know about the ⋯ menu.
 */
export function InAppBrowserContinue({ children, targetHref, className }: Props) {
  const t = useTranslations("authLogin");
  const [active, setActive] = useState(false);
  const [stayHere, setStayHere] = useState(false);

  useEffect(() => {
    if (!isLikelyInAppBrowser()) return;
    setActive(true);
  }, []);

  if (!active || stayHere) {
    return <>{children}</>;
  }

  const open = () => {
    const href =
      targetHref ??
      (typeof window !== "undefined" ? window.location.href : "");
    openInSystemBrowser(href);
  };

  return (
    <div
      className={
        className ??
        "mx-auto flex min-h-[100svh] w-full max-w-sm flex-col justify-center px-4 py-8 text-center"
      }
    >
      <Logo href={null} variant="entry" className="justify-center" showWordmark={false} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-gn-text">
        {t("inAppContinueTitle")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-gn-text-secondary">
        {t("inAppContinueBody")}
      </p>

      <button
        type="button"
        onClick={open}
        className="mt-8 flex w-full cursor-pointer items-center justify-center rounded-xl bg-gn-accent py-3.5 text-base font-semibold text-black transition-colors hover:bg-gn-accent-hover active:bg-gn-accent-pressed"
      >
        {t("inAppContinueCta")}
      </button>

      <button
        type="button"
        onClick={() => setStayHere(true)}
        className="mt-4 w-full py-2 text-sm font-medium text-gn-text-tertiary underline-offset-2 hover:text-gn-text-secondary hover:underline"
      >
        {t("inAppContinueStay")}
      </button>
    </div>
  );
}
