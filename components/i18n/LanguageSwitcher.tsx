"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { hrefWithLocale, routing } from "@/i18n/routing";

type LanguageSwitcherProps = {
  className?: string;
  selectClassName?: string;
  /** Cleaner pill style for the marketing landing header */
  variant?: "default" | "landing" | "auth";
  /** When a visible `<label htmlFor="pitchrusch-lang">` is rendered outside (e.g. auth cards). */
  hideVisuallyHiddenLabel?: boolean;
};

const defaultSelect =
  "max-w-[9.5rem] cursor-pointer rounded-lg border border-gn-border-subtle bg-gn-surface/80 py-1.5 pe-2 ps-2 text-xs font-medium text-gn-text-secondary outline-none transition-colors hover:border-gn-border hover:text-gn-text focus-visible:ring-2 focus-visible:ring-gn-accent/40 sm:max-w-none sm:text-sm";

const landingSelect =
  "mx-auto block w-full max-w-[14rem] cursor-pointer rounded-full border border-white/12 bg-white/[0.06] py-2.5 ps-4 pe-4 text-sm font-medium text-gn-text outline-none transition-[border-color,background-color,color] hover:border-white/20 hover:bg-white/[0.09] hover:text-gn-text focus-visible:ring-2 focus-visible:ring-gn-accent/50 [text-align-last:center] sm:max-w-[13rem] sm:text-base md:text-sm";

const authSelect =
  "w-full min-w-0 cursor-pointer rounded-xl border border-gn-border bg-gn-surface py-2.5 pe-3 ps-3 text-sm font-medium text-gn-text outline-none transition-[border-color,box-shadow] hover:border-gn-border focus-visible:border-gn-accent/60 focus-visible:ring-2 focus-visible:ring-gn-accent/25";

function navigateToLocale(pathname: string, next: AppLocale, current: string) {
  if (next === current) return;
  const path = pathname && pathname.length > 0 ? pathname : "/";
  const href = hrefWithLocale(path, next);
  window.location.assign(`${window.location.origin}${href}`);
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

  const baseSelect =
    selectClassName ||
    (variant === "landing"
      ? landingSelect
      : variant === "auth"
        ? authSelect
        : defaultSelect);

  /** Native `<select>` needs two taps on many mobile browsers; landing uses one-tap chips. */
  if (variant === "landing") {
    return (
      <div className={className}>
        <p className="sr-only">{tA11y("changeLanguage")}</p>
        <div className="flex max-h-[min(40vh,14rem)] w-full flex-wrap justify-center gap-2 overflow-y-auto overscroll-contain px-1 py-0.5 [-webkit-overflow-scrolling:touch]">
          {routing.locales.map((loc) => {
            const active = loc === locale;
            return (
              <button
                key={loc}
                type="button"
                lang={loc}
                aria-current={active ? "true" : undefined}
                onClick={() => navigateToLocale(pathname ?? "/", loc, locale)}
                className={[
                  "min-h-9 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                  active
                    ? "border-gn-accent bg-gn-accent/20 text-gn-accent ring-1 ring-gn-accent/35"
                    : "border-white/14 bg-white/[0.06] text-gn-text-secondary hover:border-white/22 hover:bg-white/[0.09] hover:text-gn-text",
                ].join(" ")}
              >
                {t(loc)}
              </button>
            );
          })}
        </div>
      </div>
    );
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
