"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { notifyPartnershipRequest } from "@/lib/clubs/notifyPartnershipRequest.client";
import {
  clearPendingSignupRole,
  rememberPendingSignupRole,
} from "@/lib/auth/pendingSignupRole";
import { rpcClubSubmitPartnershipRequest } from "@/lib/supabase/clubs";
import { supabase } from "@/lib/supabase/client";
import { prepareClubProofFile } from "@/lib/storage/clubProof";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BecomePartnerView() {
  const t = useTranslations("clubs");
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
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
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [partnershipStatus, setPartnershipStatus] = useState<string | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session?.user) {
        rememberPendingSignupRole("club");
        router.replace("/signup?intent=club");
        return;
      }
      clearPendingSignupRole();
      const email = data.session.user.email?.trim() ?? "";
      const fullName =
        typeof data.session.user.user_metadata?.full_name === "string"
          ? data.session.user.user_metadata.full_name.trim()
          : "";
      setForm((prev) => ({
        ...prev,
        email: prev.email || email,
        contactPerson: prev.contactPerson || fullName,
      }));
      setAuthChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!partnershipStatus) return;
    statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [partnershipStatus]);

  async function uploadProof(file: File): Promise<
    { ok: true; path: string; fileName: string } | { ok: false; error: string }
  > {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      return { ok: false, error: t("partnershipAuthRequired") };
    }

    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/clubs/upload-partnership-proof", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      path?: string;
      fileName?: string;
      reason?: string;
    };
    if (!res.ok || !json.ok || !json.path) {
      if (json.reason === "bucket_missing") {
        return { ok: false, error: t("partnershipProofBucketMissing") };
      }
      if (json.reason === "service_role_unconfigured") {
        return { ok: false, error: t("partnershipProofUploadConfigError") };
      }
      if (json.reason === "not_authenticated") {
        return { ok: false, error: t("partnershipAuthRequired") };
      }
      return { ok: false, error: t("partnershipProofUploadError") };
    }
    return { ok: true, path: json.path, fileName: json.fileName ?? file.name };
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

    const proofCheck = await prepareClubProofFile(proofFile);
    if (!proofCheck.ok) {
      setPartnershipStatus(
        proofCheck.error === "size"
          ? t("partnershipProofTooLarge")
          : proofCheck.error === "type"
            ? t("partnershipProofInvalidType")
            : t("partnershipProofRequired"),
      );
      return;
    }

    if (missing.length > 0) {
      setPartnershipStatus(t("partnershipValidationMissing", { fields: missing.join(", ") }));
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await uploadProof(proofCheck.file);
      const result = await rpcClubSubmitPartnershipRequest({
        clubName: form.clubName.trim(),
        country: form.country.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        instagram: form.instagram.trim() || undefined,
        website: form.website.trim() || undefined,
        estimatedPlayers: form.estimatedPlayers ? Number(form.estimatedPlayers) : undefined,
        message: form.message.trim() || undefined,
        proofStoragePath: uploaded.ok ? uploaded.path : undefined,
        proofFileName: uploaded.ok ? uploaded.fileName : undefined,
      });

      if (result.ok && result.requestId) {
        await notifyPartnershipRequest(result.requestId);
      }

      if (result.ok) {
        setPartnershipStatus(
          uploaded.ok
            ? t("partnershipSubmitted")
            : `${t("partnershipSubmitted")} ${uploaded.error}`,
        );
        setProofFile(null);
        return;
      }

      if (result.error === "not_authenticated") {
        rememberPendingSignupRole("club");
        router.replace("/signup?intent=club");
        return;
      }

      setPartnershipStatus(
        result.error?.includes("Could not find the function")
          ? t("partnershipSubmitErrorMigration")
          : result.error === "proof_required"
            ? uploaded.ok
              ? t("partnershipProofRequired")
              : uploaded.error
            : result.error
              ? t("partnershipSubmitErrorDetail", { error: result.error })
              : t("partnershipSubmitError"),
      );
    } catch {
      setPartnershipStatus(t("partnershipSubmitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (authChecking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-gn-text-secondary">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-10 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <Link href="/clubs" className="text-sm text-gn-accent hover:underline">
          ← {t("backToClubs")}
        </Link>
        <h1 className="text-2xl font-bold text-gn-text">{t("becomePartnerTitle")}</h1>
        <p className="text-sm text-gn-text-secondary">{t("becomePartnerSubtitle")}</p>
        <p className="text-sm text-gn-text-secondary">{t("becomePartnerProofHint")}</p>
      </header>

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

        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
            {t("fieldClubProof")}
            <span className="text-gn-accent"> *</span>
          </span>
          <p className="text-xs text-gn-text-secondary">{t("fieldClubProofHint")}</p>
          <input
            type="file"
            accept="image/*,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gn-text file:me-3 file:rounded-lg file:border-0 file:bg-gn-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black"
          />
          {proofFile ? (
            <p className="text-xs text-gn-text-secondary">{proofFile.name}</p>
          ) : (
            <p className="text-xs text-amber-200/90">{t("partnershipProofRequired")}</p>
          )}
        </label>

        {partnershipStatus ? (
          <p
            ref={statusRef}
            role="status"
            className="rounded-xl border border-gn-accent/30 bg-gn-accent/10 px-4 py-3 text-sm text-gn-text"
          >
            {partnershipStatus}
          </p>
        ) : null}

        <div className="sticky bottom-[max(0.75rem,calc(var(--gn-app-bottom-nav-offset,4.5rem)+0.35rem))] z-20 -mx-1 pt-1 lg:static lg:bottom-auto lg:z-auto lg:mx-0">
          <button
            type="submit"
            disabled={submitting}
            className={`${GN_PRIMARY_BUTTON_CLASS} w-full justify-center shadow-[0_8px_28px_-6px_rgba(249,115,22,0.55)]`}
          >
            {submitting ? t("submittingPartnershipRequest") : t("submitPartnershipRequest")}
          </button>
        </div>
      </form>
    </div>
  );
}
