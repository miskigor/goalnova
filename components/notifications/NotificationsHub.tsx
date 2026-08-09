"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { MessagesInboxView } from "@/components/messages/MessagesInboxView";
import { NotificationsActivityInbox } from "@/components/notifications/NotificationsActivityInbox";
import { ScoutMobileLayoutCheck } from "@/components/scout/ScoutMobileLayoutCheck";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { EnablePushCard } from "@/components/pwa/EnablePushCard";

type Tab = "messages" | "activity";

function parseTab(raw: string | null): Tab {
  if (raw === "activity" || raw === "obavijesti" || raw === "notifications") {
    return "activity";
  }
  return "messages";
}

export function NotificationsHub() {
  const t = useTranslations("notifications");
  const tMessages = useTranslations("messages");
  const tNav = useTranslations("nav");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const scoutGate = useScoutVerification();
  const isScout = scoutGate.loaded && scoutGate.row?.role === "scout";

  const tab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "messages") params.delete("tab");
    else params.set("tab", "activity");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  const title = tab === "activity" ? t("title") : tMessages("title");

  return (
    <>
      {isScout ? <ScoutMobileLayoutCheck /> : null}
      <h1 className="mb-4 min-w-0 break-words text-xl font-semibold tracking-tight text-gn-text max-lg:mb-2 max-lg:text-sm sm:mb-5 sm:text-2xl">
        {title}
      </h1>

      <div
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-1"
        role="tablist"
        aria-label={tNav("notifications")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "messages"}
          onClick={() => setTab("messages")}
          className={[
            "rounded-lg px-3 py-2.5 text-xs font-semibold transition",
            tab === "messages"
              ? "bg-[#FF8A00] text-black"
              : "text-gn-text-secondary hover:text-gn-text",
          ].join(" ")}
        >
          💬 {tMessages("title")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "activity"}
          onClick={() => setTab("activity")}
          className={[
            "rounded-lg px-3 py-2.5 text-xs font-semibold transition",
            tab === "activity"
              ? "bg-[#FF8A00] text-black"
              : "text-gn-text-secondary hover:text-gn-text",
          ].join(" ")}
        >
          🔔 {t("title")}
        </button>
      </div>

      {tab === "activity" ? <EnablePushCard className="mb-4" /> : null}

      {tab === "messages" ? <MessagesInboxView /> : <NotificationsActivityInbox />}
    </>
  );
}
