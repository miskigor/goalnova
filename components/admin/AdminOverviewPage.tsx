"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAdminInboxUnreadBreakdown } from "@/components/layout/AdminSupportUnreadContext";

export function AdminOverviewPage() {
  const t = useTranslations("adminDashboard");
  const { clubPending, support, verification } = useAdminInboxUnreadBreakdown();

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        {t("overviewTitle")}
      </h1>
      <p className="text-sm leading-relaxed text-zinc-400">{t("overviewIntro")}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/admin/stats", label: t("navStats") },
          { href: "/admin/users", label: t("navUsers") },
          { href: "/admin/clubs", label: t("navClubs"), badge: clubPending },
          { href: "/admin/support", label: t("navSupport"), badge: support },
          { href: "/admin/tasks", label: t("navTasks") },
          { href: "/admin/challenges", label: t("navChallenges") },
          { href: "/admin/scout-verifications", label: t("navScout"), badge: verification },
          { href: "/admin/moderation", label: t("navModeration") },
          { href: "/admin/audit", label: t("navAudit") },
        ].map((x) => (
          <li key={x.href}>
            <Link
              href={x.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-orange-300 transition hover:border-orange-500/40 hover:bg-orange-500/10"
            >
              <span>{x.label}</span>
              {x.badge && x.badge > 0 ? (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  {x.badge}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
