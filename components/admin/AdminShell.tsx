"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/lib/supabase/client";
import { fetchAdminUnreadInboxBreakdown } from "@/lib/supabase/adminSystem";

const NAV: { href: string; labelKey: string; superOnly?: boolean }[] = [
  { href: "/admin", labelKey: "navOverview" },
  { href: "/admin/users", labelKey: "navUsers" },
  { href: "/admin/profiles", labelKey: "navProfiles" },
  { href: "/admin/scout-verifications", labelKey: "navScout" },
  { href: "/admin/support", labelKey: "navSupport" },
  { href: "/admin/tasks", labelKey: "navTasks" },
  { href: "/admin/challenges", labelKey: "navChallenges" },
  { href: "/admin/music", labelKey: "navMusic" },
  { href: "/admin/moderation", labelKey: "navModeration" },
  { href: "/admin/audit", labelKey: "navAudit" },
  { href: "/admin/admins", labelKey: "navAdmins", superOnly: true },
];

function navActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("adminDashboard");
  const pathname = usePathname() ?? "";
  const { isSuperAdmin } = useAdminAccess();
  const [supportUnread, setSupportUnread] = useState(0);
  const [verificationUnread, setVerificationUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const res = await fetchAdminUnreadInboxBreakdown();
      if (cancelled || res.error) return;
      setSupportUnread(res.supportCount);
      setVerificationUnread(res.verificationCount);
    };
    void refresh();
    const ch = supabase
      .channel("admin-unread-nav")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="min-h-dvh min-w-0 w-full overflow-x-clip bg-[#0a0a0c] text-zinc-100">
      <div className="mx-auto flex min-w-0 max-w-[1600px] flex-col md:flex-row">
        <aside className="min-w-0 border-b border-white/10 bg-black/60 md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:border-b-0 md:border-r md:px-3 md:py-6">
          <div className="flex gap-2 overflow-x-auto px-3 py-3 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:py-0">
            <Link
              href="/home"
              className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-orange-400 hover:bg-white/5 md:mb-4 md:px-3"
            >
              {t("backToApp")}
            </Link>
            {NAV.filter((item) => !item.superOnly || isSuperAdmin).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  navActive(pathname, item.href)
                    ? "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/35"
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{t(item.labelKey)}</span>
                  {item.href === "/admin/support" && supportUnread > 0 ? (
                    <span className="rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300">
                      {supportUnread}
                    </span>
                  ) : null}
                  {item.href === "/admin/scout-verifications" && verificationUnread > 0 ? (
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                      {verificationUnread}
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
