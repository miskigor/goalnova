"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  fetchScoutAccessForUser,
  submitScoutVerificationApplication,
} from "@/lib/supabase/scoutVerification";
import {
  uploadScoutVerificationProofDocument,
  validateScoutProofFile,
} from "@/lib/supabase/scoutVerificationUpload";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { isApprovedScoutUser } from "@/lib/scoutVerification";
import {
  handleProfileFieldPaste,
  sanitizeEmailForStorage,
  sanitizeFullName,
  sanitizeOrganizationField,
  sanitizeScoutApplyDescription,
  sanitizeShortProfileField,
  sanitizeWebUrl,
} from "@/lib/profileFieldSanitize";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25";

type SubmitPhase = "idle" | "uploading" | "saving";

export function ScoutApplyForm() {
  const t = useTranslations("scoutVerification");
  const tCommon = useTranslations("authCommon");
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [webUrl, setWebUrl] = useState("");

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const pasteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashPasteBlocked = useCallback(() => {
    setPasteHint(t("pasteBlockedSql"));
    if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
    pasteTimerRef.current = setTimeout(() => setPasteHint(null), 5000);
  }, [t]);

  useEffect(() => {
    return () => {
      if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setBooting(true);
      setError(null);
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) {
          logFullSupabaseError("[ScoutApplyForm] getSession", sessionError);
        }
        const uid = sessionData.session?.user?.id ?? null;
        if (!uid) {
          if (!cancelled) {
            setUserId(null);
            setRole(null);
            setStatus(null);
          }
          return;
        }
        const { row, errorMessage } = await fetchScoutAccessForUser(uid);
        if (cancelled) return;
        setUserId(uid);
        if (errorMessage) {
          logFullSupabaseError(
            "[ScoutApplyForm] fetchScoutAccessForUser",
            new Error(errorMessage),
            { uid },
          );
          setError(tCommon("genericError"));
          setRole(null);
          setStatus(null);
          return;
        }
        setRole(row?.role ?? null);
        setStatus(row?.scout_verification_status ?? "none");
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [tCommon]);

  useEffect(() => {
    if (
      !booting &&
      isApprovedScoutUser({
        role: role ?? "player",
        scout_verification_status: status ?? "none",
      })
    ) {
      router.replace("/profile");
    }
  }, [booting, role, status, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!proofFile) {
      setError(t("proof.errors.required"));
      return;
    }

    const validated = validateScoutProofFile(proofFile);
    if (!validated.ok) {
      const errKey =
        validated.error === "required"
          ? "required"
          : validated.error === "size"
            ? "size"
            : "type";
      setError(t(`proof.errors.${errKey}`));
      return;
    }

    if (!userId) {
      setError(tCommon("genericError"));
      return;
    }

    const fn = sanitizeFullName(fullName);
    const org = sanitizeOrganizationField(organization);
    if (!fn.trim() || !org.trim()) {
      setError(t("errors.invalidTextFields"));
      return;
    }

    setSubmitting(true);
    setSubmitPhase("uploading");

    try {
      const uploadResult = await uploadScoutVerificationProofDocument(
        userId,
        validated.file,
      );

      if (!uploadResult.ok) {
        logFullSupabaseError(
          "[ScoutApplyForm] proof document upload failed (submit aborted, application not saved)",
          uploadResult.error.raw,
          {
            userId,
            userMessage: uploadResult.error.userMessage,
            bucket: "scout-verification-documents",
          },
        );
        setError(t("proof.errors.uploadFailed"));
        return;
      }

      setSubmitPhase("saving");

      const result = await submitScoutVerificationApplication({
        fullName,
        organization,
        businessEmail,
        country,
        description,
        webUrl,
        proofDocumentStoragePath: uploadResult.storagePath,
        proofDocumentName: uploadResult.displayName,
        proofDocumentType: uploadResult.contentType,
      });

      if (!result.ok) {
        logFullSupabaseError(
          "[ScoutApplyForm] application save failed after successful proof upload",
          new Error(String(result.code)),
          { userId, storagePath: uploadResult.storagePath, code: result.code },
        );
        throw { kind: "save" as const, code: result.code };
      }

      setStatus("pending");
      setProofFile(null);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "kind" in e &&
        (e as { kind: string }).kind === "save" &&
        "code" in e
      ) {
        const code = String((e as { code: string }).code);
        if (code === "not_eligible") {
          setError(t("errors.notEligible"));
        } else if (code === "not_authenticated" || code === "session_error") {
          setError(tCommon("genericError"));
        } else {
          setError(t("proof.errors.applicationSaveFailed"));
        }
      } else {
        logFullSupabaseError("[ScoutApplyForm] submit threw unexpectedly", e, {
          userId,
        });
        setError(tCommon("genericError"));
      }
    } finally {
      setSubmitting(false);
      setSubmitPhase("idle");
    }
  }

  if (booting) {
    return (
      <div
        className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-8"
        role="status"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
        <p className="text-sm text-gn-text-secondary">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-6">
        <p className="text-sm text-gn-text-secondary">{t("signInRequired")}</p>
        <Link
          href="/login"
          className={`${GN_PRIMARY_BUTTON_CLASS} mt-4 inline-flex h-11 items-center justify-center px-6 text-sm`}
        >
          {t("goToLogin")}
        </Link>
      </div>
    );
  }

  if (role !== "scout") {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-6">
        <p className="text-sm text-gn-text-secondary">{t("notScoutRole")}</p>
        <Link
          href="/profile"
          className="mt-4 inline-block text-sm font-medium text-gn-accent hover:underline"
        >
          {t("goToProfile")}
        </Link>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-6 text-sm text-gn-text-secondary">
        {t("redirecting")}
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div
        className="min-w-0 max-w-full overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-3 py-5 text-center sm:px-6 sm:py-7"
        role="status"
      >
        <h2 className="text-base font-semibold leading-snug tracking-tight text-gn-text break-words sm:text-lg">
          {t("pendingTitle")}
        </h2>
        <p className="mt-3 text-xs leading-relaxed text-gn-text-secondary break-words sm:mt-4 sm:text-sm">
          {t("pendingBody")}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-gn-text-secondary break-words sm:text-sm">
          {t("pendingNotify")}
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-flex text-sm font-semibold text-gn-accent hover:underline sm:mt-8"
        >
          {t("goToProfile")}
        </Link>
      </div>
    );
  }

  const formFields = (
    <ScoutApplyFields
      fullName={fullName}
      setFullName={setFullName}
      organization={organization}
      setOrganization={setOrganization}
      businessEmail={businessEmail}
      setBusinessEmail={setBusinessEmail}
      country={country}
      setCountry={setCountry}
      description={description}
      setDescription={setDescription}
      proofFile={proofFile}
      onProofFileChange={(f) => {
        setProofFile(f);
        setError(null);
      }}
      submitPhase={submitPhase}
      webUrl={webUrl}
      setWebUrl={setWebUrl}
      pasteHint={pasteHint}
      onPasteBlocked={flashPasteBlocked}
    />
  );

  const submitBlock = (
    <div className="mt-6">
      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className={`${GN_PRIMARY_BUTTON_CLASS} w-full py-3.5`}
      >
        {submitting ? t("applying") : t("submitApplication")}
      </button>
      {error ? (
        <div
          className="mt-2 whitespace-pre-line text-sm text-red-400"
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </div>
  );

  const formShared = (
    <>
      {formFields}
      {submitBlock}
    </>
  );

  if (status === "rejected") {
    return (
      <div className="space-y-6">
        <div
          role="status"
          className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-6"
        >
          <p className="text-sm font-medium text-gn-text">{t("rejectedTitle")}</p>
          <p className="mt-2 text-sm text-gn-text-secondary">{t("rejectedBody")}</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gn-text">{t("reapplyTitle")}</h2>
          <p className="mt-1 text-sm text-gn-text-secondary">{t("reapplySubtitle")}</p>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {formShared}
        </form>
      </div>
    );
  }

  /* none */
  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      {formShared}
    </form>
  );
}

function ScoutApplyFields({
  fullName,
  setFullName,
  organization,
  setOrganization,
  businessEmail,
  setBusinessEmail,
  country,
  setCountry,
  description,
  setDescription,
  proofFile,
  onProofFileChange,
  submitPhase,
  webUrl,
  setWebUrl,
  pasteHint,
  onPasteBlocked,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  organization: string;
  setOrganization: (v: string) => void;
  businessEmail: string;
  setBusinessEmail: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  proofFile: File | null;
  onProofFileChange: (file: File | null) => void;
  submitPhase: SubmitPhase;
  webUrl: string;
  setWebUrl: (v: string) => void;
  pasteHint: string | null;
  onPasteBlocked: () => void;
}) {
  const t = useTranslations("scoutVerification");
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imagePreviewUrl = useMemo(() => {
    if (!proofFile || !proofFile.type.startsWith("image/")) return null;
    return URL.createObjectURL(proofFile);
  }, [proofFile]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  return (
    <>
      {pasteHint ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90"
        >
          {pasteHint}
        </div>
      ) : null}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {t("fullName")}
        </label>
        <input
          suppressHydrationWarning
          className={inputClass}
          value={fullName}
          onChange={(e) => setFullName(sanitizeFullName(e.target.value))}
          onPaste={(e) =>
            handleProfileFieldPaste(
              e,
              fullName,
              sanitizeFullName,
              sanitizeFullName,
              setFullName,
              onPasteBlocked,
            )
          }
          required
          autoComplete="name"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {t("organization")}
        </label>
        <input
          suppressHydrationWarning
          className={inputClass}
          value={organization}
          onChange={(e) =>
            setOrganization(sanitizeOrganizationField(e.target.value))
          }
          onPaste={(e) =>
            handleProfileFieldPaste(
              e,
              organization,
              sanitizeOrganizationField,
              sanitizeOrganizationField,
              setOrganization,
              onPasteBlocked,
            )
          }
          required
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {t("businessEmail")}
        </label>
        <input
          suppressHydrationWarning
          className={inputClass}
          type="email"
          value={businessEmail}
          onChange={(e) =>
            setBusinessEmail(sanitizeEmailForStorage(e.target.value))
          }
          onPaste={(e) =>
            handleProfileFieldPaste(
              e,
              businessEmail,
              sanitizeEmailForStorage,
              sanitizeEmailForStorage,
              setBusinessEmail,
              onPasteBlocked,
            )
          }
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {t("country")}
        </label>
        <input
          suppressHydrationWarning
          className={inputClass}
          value={country}
          onChange={(e) =>
            setCountry(sanitizeShortProfileField(e.target.value))
          }
          onPaste={(e) =>
            handleProfileFieldPaste(
              e,
              country,
              sanitizeShortProfileField,
              sanitizeShortProfileField,
              setCountry,
              onPasteBlocked,
            )
          }
          required
          autoComplete="country-name"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {t("description")}
        </label>
        <textarea
          suppressHydrationWarning
          className={`${inputClass} min-h-[120px] resize-y`}
          value={description}
          onChange={(e) =>
            setDescription(sanitizeScoutApplyDescription(e.target.value))
          }
          onPaste={(e) =>
            handleProfileFieldPaste(
              e,
              description,
              sanitizeScoutApplyDescription,
              sanitizeScoutApplyDescription,
              setDescription,
              onPasteBlocked,
            )
          }
          required
        />
      </div>

      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/50 p-4 ring-1 ring-white/[0.04]">
        <h3 className="text-sm font-semibold tracking-tight text-gn-text">
          {t("proof.title")}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-gn-text-secondary">
          {t("proof.helper")}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-gn-text-tertiary">
          {t("proof.privacyNote")}
        </p>

        <input
          suppressHydrationWarning
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            onProofFileChange(f);
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitPhase !== "idle"}
            className="rounded-xl border border-gn-border bg-gn-bg/40 px-4 py-2.5 text-sm font-medium text-gn-text transition hover:border-gn-accent/40 hover:bg-white/[0.04] disabled:opacity-50"
          >
            {proofFile ? t("proof.changeFile") : t("proof.browseFiles")}
          </button>
        </div>

        {proofFile ? (
          <div
            className={`mt-2 text-sm ${
              submitPhase === "idle" ? "text-green-400" : "text-gn-text-secondary"
            }`}
          >
            <span aria-hidden>✔ </span>
            <span className="min-w-0 break-all font-medium text-gn-text">{proofFile.name}</span>
            <span className="ms-2 tabular-nums text-gn-text-tertiary">
              ({(proofFile.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>
        ) : null}

        {proofFile && proofFile.type.startsWith("image/") && imagePreviewUrl ? (
          <div className="mt-3 w-full min-w-0 max-w-full overflow-x-clip overflow-hidden rounded-lg border border-gn-border-subtle bg-black/30 touch-pan-y">
            {/* Blob URL: next/image — width-bound so the row cannot scroll sideways on mobile */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt=""
              draggable={false}
              className="mx-auto block h-auto max-h-24 w-full max-w-full object-contain object-center select-none sm:max-h-32"
            />
          </div>
        ) : null}

        {submitPhase === "uploading" ? (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gn-text-tertiary">
              <span className="font-medium text-gn-text-secondary">
                {t("proof.uploading")}
              </span>
              <span className="text-gn-text-tertiary">
                {t("proof.uploadProgressUnknown")}
              </span>
            </div>
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-gn-bg/80"
              role="progressbar"
              aria-busy="true"
              aria-valuetext={t("proof.uploading")}
            >
              <div className="gn-upload-indeterminate-bar absolute inset-y-0 w-[35%] rounded-full bg-gradient-to-r from-gn-accent/70 to-gn-accent" />
            </div>
          </div>
        ) : null}

        {submitPhase === "saving" ? (
          <p
            className="mt-4 text-sm font-medium text-green-400"
            role="status"
            aria-live="polite"
          >
            <span aria-hidden>✔ </span>
            {t("proof.uploadComplete")}
          </p>
        ) : null}

        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-3 text-xs leading-relaxed text-gn-text-secondary ring-1 ring-amber-500/10">
          <p className="font-medium text-amber-100/95">{t("proof.trustLine1")}</p>
          <p className="mt-1.5 text-gn-text-secondary">{t("proof.trustLine2")}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {t("webUrl")}
        </label>
        <input
          suppressHydrationWarning
          className={inputClass}
          type="url"
          value={webUrl}
          onChange={(e) => setWebUrl(sanitizeWebUrl(e.target.value))}
          onPaste={(e) =>
            handleProfileFieldPaste(
              e,
              webUrl,
              sanitizeWebUrl,
              sanitizeWebUrl,
              setWebUrl,
              onPasteBlocked,
            )
          }
          placeholder="https://"
        />
      </div>
    </>
  );
}
