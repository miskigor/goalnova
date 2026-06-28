"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { rpcClubJoin, rpcClubSubmitPartnershipRequest } from "@/lib/supabase/clubs";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

export function BecomePartnerView() {
  const t = useTranslations("clubs");
  const [form, setForm] = useState({
    clubName: "",
    country: "",
    contactPerson: "",
    email: "",
    instagram: "",
    website: "",
    estimatedPlayers: "",
    message: "",
  });
  const [clubCode, setClubCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submitPartnership(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const result = await rpcClubSubmitPartnershipRequest({
      clubName: form.clubName,
      country: form.country,
      contactPerson: form.contactPerson,
      email: form.email,
      instagram: form.instagram || undefined,
      website: form.website || undefined,
      estimatedPlayers: form.estimatedPlayers ? Number(form.estimatedPlayers) : undefined,
      message: form.message || undefined,
    });
    setSubmitting(false);
    setStatus(result.ok ? t("partnershipSubmitted") : t("partnershipSubmitError"));
  }

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setStatus(null);
    const result = await rpcClubJoin({ clubCode: clubCode.trim().toUpperCase() });
    setJoining(false);
    if (result.ok) setStatus(t("joinPending", { club: result.clubName ?? clubCode }));
    else setStatus(result.error === "already_member" ? t("alreadyMember") : t("joinError"));
  }

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-10 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <Link href="/clubs" className="text-sm text-gn-accent hover:underline">
          ← {t("backToClubs")}
        </Link>
        <h1 className="text-2xl font-bold text-gn-text">{t("becomePartnerTitle")}</h1>
        <p className="text-sm text-gn-text-secondary">{t("becomePartnerSubtitle")}</p>
      </header>

      <section className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-5">
        <h2 className="text-base font-semibold text-gn-text">{t("joinWithCodeTitle")}</h2>
        <p className="mt-1 text-sm text-gn-text-secondary">{t("joinWithCodeHint")}</p>
        <form onSubmit={(e) => void joinByCode(e)} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={clubCode}
            onChange={(e) => setClubCode(e.target.value.toUpperCase())}
            placeholder="DINAMO2026"
            className="min-h-11 flex-1 rounded-xl border border-gn-border-subtle bg-black/40 px-4 font-mono text-sm uppercase tracking-wider text-gn-text outline-none focus:border-gn-accent/50"
          />
          <button type="submit" disabled={joining} className={`${GN_PRIMARY_BUTTON_CLASS} min-h-11`}>
            {t("joinClub")}
          </button>
        </form>
      </section>

      <form onSubmit={(e) => void submitPartnership(e)} className="space-y-4 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-5">
        <h2 className="text-base font-semibold text-gn-text">{t("requestPartnershipTitle")}</h2>
        {(
          [
            ["clubName", form.clubName, t("fieldClubName"), true],
            ["country", form.country, t("fieldCountry"), true],
            ["contactPerson", form.contactPerson, t("fieldContactPerson"), true],
            ["email", form.email, t("fieldEmail"), true],
            ["instagram", form.instagram, t("fieldInstagram"), false],
            ["website", form.website, t("fieldWebsite"), false],
            ["estimatedPlayers", form.estimatedPlayers, t("fieldEstimatedPlayers"), false],
          ] as const
        ).map(([key, value, label, required]) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
              {label}
            </span>
            <input
              required={required}
              type={key === "email" ? "email" : key === "estimatedPlayers" ? "number" : "text"}
              value={value}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-gn-border-subtle bg-black/40 px-4 text-sm text-gn-text outline-none focus:border-gn-accent/50"
            />
          </label>
        ))}
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
            {t("fieldMessage")}
          </span>
          <textarea
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            rows={4}
            className="w-full rounded-xl border border-gn-border-subtle bg-black/40 px-4 py-3 text-sm text-gn-text outline-none focus:border-gn-accent/50"
          />
        </label>
        <button type="submit" disabled={submitting} className={`${GN_PRIMARY_BUTTON_CLASS} w-full justify-center`}>
          {t("submitPartnershipRequest")}
        </button>
      </form>

      {status ? (
        <p role="status" className="rounded-xl border border-gn-accent/30 bg-gn-accent/10 px-4 py-3 text-sm text-gn-text">
          {status}
        </p>
      ) : null}
    </div>
  );
}
