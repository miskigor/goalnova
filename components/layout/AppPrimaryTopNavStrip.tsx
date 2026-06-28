"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItemActive } from "@/lib/navigation/navItemActive";

const PRIMARY_LINKS = [
  { href: "/home", labelKey: "home", emoji: "🏠" },
  { href: "/explore", labelKey: "explore", emoji: "🔍" },
  { href: "/rankings", labelKey: "rankings" },
  { href: "/challenges", labelKey: "challenges", emoji: "🏆" },
] as const;

function isClubsRoute(pathname: string): boolean {
  return pathname === "/clubs" || pathname.startsWith("/clubs/");
}

/** Primary horizontal tabs — visible on mobile/tablet where sidebar is hidden. */
export function AppPrimaryTopNavStrip() {
  const pathname = usePathname() ?? "";
  const t = useTranslations("nav");

  if (isClubsRoute(pathname)) {
    return null;
  }

  return (
    <nav
      data-app-primary-top-nav
      className="box-border w-full max-w-full shrink-0 overflow-x-clip border-b border-gn-border-subtle bg-gn-bg/95 backdrop-blur-md lg:hidden"
      aria-label={t("primary")}
    >
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain px-2 py-2 [-webkit-overflow-scrolling:touch]">
        {PRIMARY_LINKS.map((item) => {
          const active = navItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-tight transition duration-200",
                active
                  ? "border-gn-accent/50 bg-gn-accent/15 text-gn-accent shadow-[0_0_16px_rgba(249,115,22,0.15)]"
                  : "border-gn-border-subtle bg-gn-surface/40 text-gn-text-secondary hover:border-gn-accent/30 hover:text-gn-text",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              {"emoji" in item && item.emoji ? (
                <span className="text-sm leading-none" aria-hidden>
                  {item.emoji}
                </span>
              ) : null}
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
