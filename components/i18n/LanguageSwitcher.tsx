"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { hrefWithLocale, routing } from "@/i18n/routing";
import { persistLocalePreference } from "@/lib/i18n/localePreference";

type LanguageSwitcherProps = {
  className?: string;
  selectClassName?: string;
  /** Compact dropdown for marketing landing nav (single active label + menu). */
  variant?: "default" | "landing" | "auth";
  /** When a visible `<label htmlFor="pitchrusch-lang">` is rendered outside (e.g. auth cards). */
  hideVisuallyHiddenLabel?: boolean;
};

const defaultSelect =
  "max-w-[9.5rem] cursor-pointer rounded-lg border border-gn-border-subtle bg-gn-surface/80 py-1.5 pe-2 ps-2 text-xs font-medium text-gn-text-secondary outline-none transition-colors hover:border-gn-border hover:text-gn-text focus-visible:ring-2 focus-visible:ring-gn-accent/40 sm:max-w-none sm:text-sm";

const authSelect =
  "w-full min-w-0 cursor-pointer rounded-xl border border-gn-border bg-gn-surface py-2.5 pe-3 ps-3 text-sm font-medium text-gn-text outline-none transition-[border-color,box-shadow] hover:border-gn-border focus-visible:border-gn-accent/60 focus-visible:ring-2 focus-visible:ring-gn-accent/25";

const landingTrigger =
  "inline-flex max-w-[7.25rem] min-w-0 items-center gap-1 rounded-full border border-white/14 bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-gn-text transition-[border-color,background-color] hover:border-white/22 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/50 sm:max-w-[9.5rem] sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm";

function navigateToLocale(pathname: string, next: AppLocale, current: string) {
  if (next === current) return;
  persistLocalePreference(next);
  const path = pathname && pathname.length > 0 ? pathname : "/";
  const href = hrefWithLocale(path, next);
  window.location.assign(`${window.location.origin}${href}`);
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-gn-accent" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-gn-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LandingLanguageDropdown({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("language");
  const tA11y = useTranslations("a11y");
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={landingTrigger}
      >
        <span className="truncate">{t(locale)}</span>
        <ChevronIcon open={open} />
      </button>
      <span className="sr-only">{tA11y("changeLanguage")}</span>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[90] bg-black/50 sm:hidden"
            aria-label={tA11y("closeLanguageMenu")}
            onClick={() => setOpen(false)}
          />
          <ul
            id={listId}
            role="listbox"
            aria-label={tA11y("changeLanguage")}
            className="fixed left-4 right-4 top-[3.25rem] z-[100] max-h-[min(70vh,22rem)] overflow-y-auto overscroll-contain rounded-2xl border border-white/12 bg-zinc-950 py-1.5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-52 sm:max-w-none"
          >
            {routing.locales.map((loc) => {
              const active = loc === locale;
              return (
                <li key={loc} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    lang={loc}
                    onClick={() => {
                      setOpen(false);
                      navigateToLocale(pathname ?? "/", loc, locale);
                    }}
                    className={[
                      "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors",
                      active
                        ? "border-s-2 border-gn-accent bg-gn-accent/10 text-gn-text"
                        : "border-s-2 border-transparent text-gn-text-secondary hover:bg-white/[0.06] hover:text-gn-text",
                    ].join(" ")}
                  >
                    <span>{t(loc)}</span>
                    {active ? <CheckIcon /> : <span className="w-4 shrink-0" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function LanguageSwitcher({
  className = "",
  selectClassName = "",
  variant = "default",
  hideVisuallyHiddenLabel = false,
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("language");
  const tA11y = useTranslations("a11y");

  const baseSelect = selectClassName || (variant === "auth" ? authSelect : defaultSelect);

  if (variant === "landing") {
    return <LandingLanguageDropdown className={className} />;
  }

  return (
    <div className={className}>
      {hideVisuallyHiddenLabel ? null : (
        <label className="sr-only" htmlFor="pitchrusch-lang">
          {tA11y("changeLanguage")}
        </label>
      )}
      <select
        suppressHydrationWarning
        id="pitchrusch-lang"
        value={locale}
        onChange={(e) => {
          const next = e.target.value as AppLocale;
          navigateToLocale(pathname ?? "/", next, locale);
        }}
        className={baseSelect}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(loc)}
          </option>
        ))}
      </select>
    </div>
  );
}
