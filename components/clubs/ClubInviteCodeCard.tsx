"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { hrefWithLocale } from "@/i18n/routing";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

type Props = {
  clubCode: string | null | undefined;
};

export function ClubInviteCodeCard({ clubCode }: Props) {
  const t = useTranslations("clubs");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const code = clubCode?.trim() ?? "";
  const inviteUrl = code ? `https://pitchrusch.com${hrefWithLocale(`/invite/${code}`, locale)}` : "";

  if (!code) return null;

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="rounded-2xl border border-gn-accent/35 bg-gn-accent/10 p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gn-text-tertiary">
        {t("inviteLink")}
      </h2>
      <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-gn-text">{code}</p>
      {inviteUrl ? (
        <p className="mt-2 break-all font-mono text-xs text-gn-accent sm:text-sm">{inviteUrl}</p>
      ) : null}
      <p className="mt-2 text-xs text-gn-text-secondary">{t("inviteHint", { code })}</p>
      <button
        type="button"
        onClick={() => void copyInviteCode()}
        className={`${GN_PRIMARY_BUTTON_CLASS} mt-3 text-xs`}
      >
        {copied ? t("inviteCodeCopied") : t("copyInviteCode")}
      </button>
    </section>
  );
}
