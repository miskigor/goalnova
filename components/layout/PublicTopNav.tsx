"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { navItemActive } from "@/lib/navigation/navItemActive";

function desktopLinkClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    "rounded-lg px-3.5 py-2 text-sm font-medium tracking-tight transition-[color,background-color,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
    active
      ? "bg-white/[0.09] text-gn-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      : "text-gn-text-secondary hover:bg-white/[0.06] hover:text-gn-text motion-safe:hover:scale-[1.02]",
  ].join(" ");
}

function sheetLinkClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    "flex w-full items-center rounded-xl px-4 py-3.5 text-base font-medium transition-[color,background-color] duration-300 ease-gn-smooth",
    active
      ? "bg-white/[0.09] text-gn-accent"
      : "text-gn-text hover:bg-white/[0.06] hover:text-gn-text-secondary",
  ].join(" ");
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const init = window.setTimeout(() => setReduced(mq.matches), 0);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => {
      window.clearTimeout(init);
      mq.removeEventListener("change", onChange);
    };
  }, []);
  return reduced;
}

type Props = {
  trailing?: ReactNode;
};

/**
 * Guest-only top navigation for public routes (explore, etc.).
 * Logged-in users on public routes use {@link AppChromeLayout} instead.
 */
export function PublicTopNav({ trailing }: Props) {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tExplore = useTranslations("explore");
  const tPublicGuest = useTranslations("publicGuest");
  const reduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetEntered, setSheetEntered] = useState(false);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setSheetEntered(false);
    if (reduceMotion) setSheetMounted(false);
  }, [reduceMotion]);

  const openMobileSheet = useCallback(() => {
    setSheetEntered(false);
    setSheetMounted(true);
    setMobileOpen(true);
    if (reduceMotion) setSheetEntered(true);
  }, [reduceMotion]);

  useEffect(() => {
    const id = window.setTimeout(() => closeMobile(), 0);
    return () => window.clearTimeout(id);
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen || !sheetMounted || reduceMotion) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setSheetEntered(true)),
    );
    return () => cancelAnimationFrame(id);
  }, [mobileOpen, sheetMounted, reduceMotion]);

  useEffect(() => {
    if (!sheetMounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetMounted]);

  function onSheetTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.propertyName !== "transform") return;
    if (!mobileOpen) {
      setSheetMounted(false);
    }
  }

  return (
    <>
      <div className="box-border flex w-full min-w-0 max-w-full items-center gap-2 overflow-x-clip sm:gap-4 lg:gap-6">
        <Logo href="/explore" variant="header" className="min-w-0 shrink-0" />

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2 lg:flex"
          aria-label={tNav("primary")}
        >
          <Link
            href="/explore"
            className={desktopLinkClass(pathname, "/explore")}
            aria-current={
              navItemActive(pathname, "/explore") ? "page" : undefined
            }
          >
            {tNav("explore")}
          </Link>
          <Link
            href="/rankings"
            className={desktopLinkClass(pathname, "/rankings")}
            aria-current={
              navItemActive(pathname, "/rankings") ? "page" : undefined
            }
          >
            {tNav("rankings")}
          </Link>
          <Link
            href="/login"
            className={desktopLinkClass(pathname, "/login")}
            aria-current={navItemActive(pathname, "/login") ? "page" : undefined}
          >
            {tExplore("navLogin")}
          </Link>
          <Link
            href="/signup"
            className={[
              "rounded-full px-4 py-2 text-sm font-semibold tracking-tight transition-[background-color,box-shadow,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
              navItemActive(pathname, "/signup")
                ? "bg-gn-accent text-gn-bg shadow-[0_0_24px_-4px_rgba(249,115,22,0.55)]"
                : "bg-gn-accent text-gn-bg shadow-[0_8px_28px_-10px_rgba(249,115,22,0.45)] hover:bg-gn-accent-hover hover:shadow-[0_12px_36px_-8px_rgba(249,115,22,0.55)] motion-safe:active:scale-[0.98]",
            ].join(" ")}
            aria-current={
              navItemActive(pathname, "/signup") ? "page" : undefined
            }
          >
            {tExplore("navSignUp")}
          </Link>
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 lg:flex-none lg:gap-3">
          <div className="hidden items-center gap-2 lg:flex">{trailing}</div>

          <Link
            href="/login"
            className="inline-flex h-10 max-w-[min(100%,9.5rem)] shrink-0 items-center justify-center truncate rounded-xl bg-gn-accent px-3 text-xs font-semibold text-gn-bg shadow-[0_6px_20px_-8px_rgba(249,115,22,0.5)] transition-[background-color,transform] duration-200 hover:bg-gn-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/40 motion-safe:active:scale-[0.98] sm:max-w-none sm:px-3.5 sm:text-sm lg:hidden"
            aria-current={navItemActive(pathname, "/login") ? "page" : undefined}
          >
            {tPublicGuest("headerCta")}
          </Link>

          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/40 text-gn-text transition-all duration-200 hover:border-gn-border hover:bg-gn-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/40 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="pitchrusch-public-mobile-nav"
            onClick={() => (mobileOpen ? closeMobile() : openMobileSheet())}
            aria-label={mobileOpen ? tNav("closeMainNav") : tNav("openMainNav")}
          >
            {mobileOpen ? (
              <svg
                className="size-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                className="size-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {sheetMounted ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              sheetEntered ? "opacity-100" : "opacity-0"
            }`}
            aria-label={tNav("closeMainNav")}
            onClick={closeMobile}
          />
          <div
            id="pitchrusch-public-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pitchrusch-public-mobile-nav-title"
            onTransitionEnd={onSheetTransitionEnd}
            className={`absolute inset-y-0 end-0 flex w-[min(100%,20rem)] flex-col border-s border-gn-border-subtle bg-gn-bg/98 shadow-[-16px_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
              sheetEntered
                ? "translate-x-0"
                : "ltr:translate-x-full rtl:-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gn-border-subtle px-4 py-3.5">
              <span
                id="pitchrusch-public-mobile-nav-title"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-gn-text-tertiary"
              >
                {tNav("primary")}
              </span>
              <button
                type="button"
                className="rounded-lg p-2 text-gn-text-secondary transition-colors hover:bg-gn-surface-elevated hover:text-gn-text"
                onClick={closeMobile}
                aria-label={tNav("closeMainNav")}
              >
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav
              className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-4"
              aria-label={tNav("primary")}
            >
              <Link
                href="/explore"
                className={sheetLinkClass(pathname, "/explore")}
                onClick={closeMobile}
                aria-current={
                  navItemActive(pathname, "/explore") ? "page" : undefined
                }
              >
                {tNav("explore")}
              </Link>
              <Link
                href="/rankings"
                className={sheetLinkClass(pathname, "/rankings")}
                onClick={closeMobile}
                aria-current={
                  navItemActive(pathname, "/rankings") ? "page" : undefined
                }
              >
                {tNav("rankings")}
              </Link>
              <Link
                href="/login"
                className={sheetLinkClass(pathname, "/login")}
                onClick={closeMobile}
                aria-current={
                  navItemActive(pathname, "/login") ? "page" : undefined
                }
              >
                {tExplore("navLogin")}
              </Link>
              <Link
                href="/signup"
                className={[
                  "mt-2 flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-base font-semibold transition-[background-color,box-shadow,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
                  navItemActive(pathname, "/signup")
                    ? "bg-gn-accent text-gn-bg shadow-[0_0_24px_-4px_rgba(249,115,22,0.55)]"
                    : "bg-gn-accent text-gn-bg shadow-[0_8px_28px_-10px_rgba(249,115,22,0.45)] hover:bg-gn-accent-hover hover:shadow-[0_12px_36px_-8px_rgba(249,115,22,0.55)] motion-safe:active:scale-[0.99]",
                ].join(" ")}
                onClick={closeMobile}
                aria-current={
                  navItemActive(pathname, "/signup") ? "page" : undefined
                }
              >
                {tExplore("navSignUp")}
              </Link>
            </nav>

            <div className="border-t border-gn-border-subtle px-3 py-4">
              <LanguageSwitcher className="w-full [&_select]:w-full" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
