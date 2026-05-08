"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  adminReviewScoutVerification,
  createScoutProofSignedUrl,
  fetchAllScoutVerificationApplications,
  type ScoutVerificationApplicationRow,
} from "@/lib/supabase/adminScoutVerification";
import { markAllAdminScoutVerificationNotificationsRead } from "@/lib/supabase/adminSystem";
import { VerifiedScoutBadge } from "@/components/scout/VerifiedScoutBadge";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Link } from "@/i18n/navigation";

function statusBadgeClass(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "approved") {
    return "bg-emerald-500/15 text-emerald-300 ring-emerald-400/35";
  }
  if (s === "rejected") {
    return "bg-red-500/15 text-red-300 ring-red-400/30";
  }
  return "bg-amber-500/15 text-amber-200 ring-amber-400/35";
}

export function AdminScoutVerificationsView() {
  const t = useTranslations("adminScoutVerification");
  const { isSuperAdmin } = useAdminAccess();

  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState<ScoutVerificationApplicationRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [reviewing, setReviewing] = useState<{
    userId: string;
    action: "approve" | "reject";
  } | null>(null);
  const [proofLoadingUserId, setProofLoadingUserId] = useState<string | null>(
    null,
  );

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const { rows: next, error } = await fetchAllScoutVerificationApplications();
    if (error) {
      logFullSupabaseError("[admin] scout verification list", new Error(error));
      setListError(t("errors.listLoadFailed"));
      setRows([]);
    } else {
      setRows(next);
    }
    setListLoading(false);
  }, [t]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void markAllAdminScoutVerificationNotificationsRead();
  }, []);

  async function onViewProof(row: ScoutVerificationApplicationRow) {
    const path = row.proof_document_url?.trim();
    if (!path) {
      logFullSupabaseError(
        "[admin] view proof: no proof_document_url",
        new Error("missing_proof_path"),
        { userId: row.user_id },
      );
      return;
    }
    setProofLoadingUserId(row.user_id);
    try {
      const { url, error } = await createScoutProofSignedUrl(path, 600);
      if (error || !url) {
        logFullSupabaseError("[admin] view proof failed", new Error(error ?? "no url"), {
          userId: row.user_id,
        });
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setProofLoadingUserId(null);
    }
  }

  async function onReview(subjectUserId: string, action: "approve" | "reject") {
    setReviewing({ userId: subjectUserId, action });
    setListError(null);
    try {
      const { ok, error } = await adminReviewScoutVerification(
        subjectUserId,
        action,
      );
      if (!ok) {
        if (error) {
          logFullSupabaseError(
            "[admin] scout review failed",
            new Error(error),
            { subjectUserId, action },
          );
        }
        setListError(t("errors.actionFailed"));
        return;
      }
      await markAllAdminScoutVerificationNotificationsRead();
      await loadList();
    } finally {
      setReviewing(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 pt-2">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gn-text">
            {t("pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-gn-text-secondary">{t("pageSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadList()}
          disabled={listLoading}
          className="rounded-xl border border-gn-border-subtle px-4 py-2 text-sm font-medium text-gn-text-secondary transition hover:bg-white/[0.06] hover:text-gn-text disabled:opacity-50"
        >
          {listLoading ? t("refreshing") : t("refresh")}
        </button>
      </header>

      {listError ? (
        <div
          className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      {listLoading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
        </div>
      ) : null}

      {!listLoading && rows.length === 0 && !listError ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-6 py-12 text-center sm:px-10">
          <h2 className="text-lg font-semibold tracking-tight text-gn-text">
            {t("emptyTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gn-text-secondary">
            {t("emptyBody")}
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {rows.map((row) => {
          const pending = (row.status ?? "").toLowerCase() === "pending";
          const busy =
            reviewing?.userId === row.user_id ? reviewing.action : null;
          const proofBusy = proofLoadingUserId === row.user_id;
          const hasProof = Boolean(row.proof_document_url?.trim());

          return (
            <article
              key={row.user_id}
              className="rounded-2xl border border-gn-border-subtle bg-gn-surface/35 p-4 shadow-sm ring-1 ring-white/[0.03] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gn-border-subtle pb-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gn-text">
                      {row.full_name?.trim() || "—"}
                    </p>
                    {(row.status ?? "").toLowerCase() === "approved" ? (
                      <VerifiedScoutBadge withTooltip={false} className="shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-xs text-gn-text-tertiary">
                    {t("userIdLabel")}:{" "}
                    <code className="text-gn-text-secondary">{row.user_id}</code>
                  </p>
                  <Link
                    href={`/admin/users/${row.user_id}`}
                    className="mt-1 inline-block text-xs font-medium text-gn-accent hover:underline"
                  >
                    {t("openInUsers")}
                  </Link>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${statusBadgeClass(row.status)}`}
                >
                  {row.status ?? t("statusUnknown")}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gn-text-tertiary">{t("organization")}</dt>
                  <dd className="text-gn-text">{row.organization ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gn-text-tertiary">{t("businessEmail")}</dt>
                  <dd className="break-all text-gn-text">{row.business_email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gn-text-tertiary">{t("country")}</dt>
                  <dd className="text-gn-text">{row.country ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gn-text-tertiary">{t("createdAt")}</dt>
                  <dd className="text-gn-text tabular-nums">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gn-text-tertiary">{t("description")}</dt>
                  <dd className="whitespace-pre-wrap text-gn-text">
                    {row.description?.trim() || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gn-text-tertiary">{t("webUrl")}</dt>
                  <dd className="break-all">
                    {row.web_url?.trim() ? (
                      <a
                        href={row.web_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gn-accent hover:underline"
                      >
                        {row.web_url.trim()}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gn-text-tertiary">{t("proofDocumentName")}</dt>
                  <dd className="text-gn-text">
                    {row.proof_document_name?.trim() || "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-gn-border-subtle pt-4">
                {hasProof ? (
                  <button
                    type="button"
                    disabled={proofBusy}
                    onClick={() => void onViewProof(row)}
                    className="rounded-xl border border-gn-border-subtle bg-gn-bg/40 px-4 py-2 text-sm font-medium text-gn-text transition hover:border-gn-accent/40 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {proofBusy ? t("openingProof") : t("viewProof")}
                  </button>
                ) : (
                  <span className="text-xs text-gn-text-tertiary">{t("noProof")}</span>
                )}

                {pending && isSuperAdmin ? (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      aria-busy={busy === "approve"}
                      onClick={() => void onReview(row.user_id, "approve")}
                      className="rounded-xl bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-400/30 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy === "approve" ? t("approving") : t("approve")}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      aria-busy={busy === "reject"}
                      onClick={() => void onReview(row.user_id, "reject")}
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy === "reject" ? t("rejecting") : t("reject")}
                    </button>
                  </>
                ) : pending && !isSuperAdmin ? (
                  <span className="self-center text-xs text-amber-200/90">
                    Super admin only — approve/reject
                  </span>
                ) : (
                  <span className="self-center text-xs text-gn-text-tertiary">
                    {t("noActions")}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
