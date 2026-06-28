"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { notifyClubPlayerJoin } from "@/lib/clubs/notifyClubPlayerJoin.client";
import { notifyPartnershipRequest } from "@/lib/clubs/notifyPartnershipRequest.client";
import { rpcClubJoin, rpcClubSubmitPartnershipRequest } from "@/lib/supabase/clubs";
import { supabase } from "@/lib/supabase/client";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [partnershipStatus, setPartnershipStatus] = useState<string | null>(null);

  function joinErrorMessage(code?: string): string {
    if (code === "already_member") return t("alreadyMember");
    if (code === "club_not_found") return t("joinErrorClubNotFound");
    if (code === "Not authenticated") return t("joinErrorNotSignedIn");
    return t("joinError");
  }

  async function submitPartnership(e: React.FormEvent) {
    e.preventDefault();
    setPartnershipStatus(null);

    const missing: string[] = [];
    if (!form.clubName.trim()) missing.push(t("fieldClubName"));
    if (!form.country.trim()) missing.push(t("fieldCountry"));
    if (!form.contactPerson.trim()) missing.push(t("fieldContactPerson"));
    if (!form.email.trim()) missing.push(t("fieldContactEmail"));
    if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
      setPartnershipStatus(t("partnershipValidationEmail"));
      return;
    }
    if (missing.length > 0) {
      setPartnershipStatus(t("partnershipValidationMissing", { fields: missing.join(", ") }));
      return;
    }

    setSubmitting(true);
    const result = await rpcClubSubmitPartnershipRequest({
      clubName: form.clubName.trim(),
      country: form.country.trim(),
      contactPerson: form.contactPerson.trim(),
      email: form.email.trim(),
      instagram: form.instagram.trim() || undefined,
      website: form.website.trim() || undefined,
      estimatedPlayers: form.estimatedPlayers ? Number(form.estimatedPlayers) : undefined,
      message: form.message.trim() || undefined,
    });
    setSubmitting(false);
    if (result.ok) {
      if (result.requestId) void notifyPartnershipRequest(result.requestId);
      setPartnershipStatus(t("partnershipSubmitted"));
      return;
    }
    setPartnershipStatus(
      result.error?.includes("Could not find the function")
        ? t("partnershipSubmitErrorMigration")
        : result.error
          ? t("partnershipSubmitErrorDetail", { error: result.error })
          : t("partnershipSubmitError"),
    );
  }

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    setJoinStatus(null);

    const code = clubCode.trim().toUpperCase();
    if (!code) {
      setJoinStatus(t("joinErrorCodeRequired"));
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      setJoinStatus(t("joinErrorNotSignedIn"));
      return;
    }

    setJoining(true);
    const result = await rpcClubJoin({ clubCode: code });
    setJoining(false);
    if (result.ok && result.clubId) {
      void notifyClubPlayerJoin({
        clubId: result.clubId,
        membershipId: result.membershipId,
      });
      setJoinStatus(t("joinPending", { club: result.clubName ?? code }));
      return;
    }
    setJoinStatus(joinErrorMessage(result.error));
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
        <form noValidate onSubmit={(e) => void joinByCode(e)} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={clubCode}
            onChange={(e) => setClubCode(e.target.value.toUpperCase())}
            placeholder="DINAMO2026"
            aria-label={t("joinWithCodeTitle")}
            className="min-h-11 flex-1 rounded-xl border border-gn-border-subtle bg-black/40 px-4 font-mono text-sm uppercase tracking-wider text-gn-text outline-none focus:border-gn-accent/50"
          />
          <button type="submit" disabled={joining} className={`${GN_PRIMARY_BUTTON_CLASS} min-h-11`}>
            {t("joinClub")}
          </button>
        </form>
        {joinStatus ? (
          <p role="status" className="mt-3 rounded-xl border border-gn-accent/30 bg-gn-accent/10 px-4 py-3 text-sm text-gn-text">
            {joinStatus}
          </p>
        ) : null}
      </section>

      <form
        noValidate
        onSubmit={(e) => void submitPartnership(e)}
        className="space-y-4 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-5"
      >
        <h2 className="text-base font-semibold text-gn-text">{t("requestPartnershipTitle")}</h2>
        <p className="text-sm text-gn-text-secondary">{t("partnershipRequiredHint")}</p>
        {(
          [
            ["clubName", form.clubName, t("fieldClubName"), true],
            ["country", form.country, t("fieldCountry"), true],
            ["contactPerson", form.contactPerson, t("fieldContactPerson"), true],
            ["email", form.email, t("fieldContactEmail"), true],
            ["instagram", form.instagram, t("fieldInstagram"), false],
            ["website", form.website, t("fieldWebsite"), false],
            ["estimatedPlayers", form.estimatedPlayers, t("fieldEstimatedPlayers"), false],
          ] as const
        ).map(([key, value, label, required]) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
              {label}
              {required ? <span className="text-gn-accent"> *</span> : null}
            </span>
            {key === "email" ? (
              <p className="text-xs text-gn-text-secondary">{t("fieldContactEmailHint")}</p>
            ) : null}
            <input
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
        {partnershipStatus ? (
          <p role="status" className="rounded-xl border border-gn-accent/30 bg-gn-accent/10 px-4 py-3 text-sm text-gn-text">
            {partnershipStatus}
          </p>
        ) : null}
      </form>
    </div>
  );
}
