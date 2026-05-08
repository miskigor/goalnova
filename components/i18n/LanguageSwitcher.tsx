"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
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
  "max-w-[10rem] cursor-pointer rounded-full border border-white/10 bg-black/30 py-2 pe-3 ps-3 text-xs font-medium text-gn-text outline-none backdrop-blur-md transition-[border-color,background-color,color] hover:border-white/18 hover:bg-white/[0.06] hover:text-gn-text focus-visible:ring-2 focus-visible:ring-gn-accent/50 sm:max-w-[11rem] sm:text-sm";

const authSelect =
  "w-full min-w-0 cursor-pointer rounded-xl border border-gn-border bg-gn-surface py-2.5 pe-3 ps-3 text-sm font-medium text-gn-text outline-none transition-[border-color,box-shadow] hover:border-gn-border focus-visible:border-gn-accent/60 focus-visible:ring-2 focus-visible:ring-gn-accent/25";

export function LanguageSwitcher({
  className = "",
  selectClassName = "",
  variant = "default",
  hideVisuallyHiddenLabel = false,
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("language");
  const tA11y = useTranslations("a11y");

  const baseSelect =
    selectClassName ||
    (variant === "landing" ? landingSelect : variant === "auth" ? authSelect : defaultSelect);

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
          if (variant === "landing") {
            const path = pathname || "/";
            window.location.assign(
              `${window.location.origin}${hrefWithLocale(path, next)}`,
            );
            return;
          }
          startTransition(() => {
            router.replace(pathname, { locale: next });
            router.refresh();
          });
        }}
        disabled={isPending}
        aria-busy={isPending}
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
