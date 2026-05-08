"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  rpcAdminDeleteComment,
  rpcAdminDeleteVideo,
  rpcAdminListModerationReports,
  rpcAdminUpdateModerationReport,
  type ModerationReportRow,
} from "@/lib/supabase/adminSystem";
import { useAdminAccess } from "@/hooks/useAdminAccess";

export function AdminModerationPage() {
  const t = useTranslations("adminDashboard");
  const tc = useTranslations("common");
  const { isSupportAdmin } = useAdminAccess();
  const [reports, setReports] = useState<ModerationReportRow[]>([]);
  const [videoId, setVideoId] = useState("");
  const [commentId, setCommentId] = useState("");

  const load = useCallback(async () => {
    const { rows } = await rpcAdminListModerationReports({ status: "open" });
    setReports(rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (isSupportAdmin) {
    return (
      <p className="text-zinc-500">{t("moderationSupportOnlyBody")}</p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-white">{t("moderationTitle")}</h1>

      <section className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
        <h2 className="text-sm font-medium text-zinc-300">{t("deleteVideo")}</h2>
        <input
          suppressHydrationWarning
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          placeholder={t("placeholderVideoUuid")}
          className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={async () => {
            if (!videoId.trim() || !window.confirm(t("confirmDeleteVideo")))
              return;
            const { ok, error } = await rpcAdminDeleteVideo(videoId.trim());
            alert(ok ? tc("done") : error ?? tc("failed"));
            setVideoId("");
          }}
          className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white"
        >
          {tc("delete")}
        </button>
      </section>

      <section className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
        <h2 className="text-sm font-medium text-zinc-300">{t("deleteComment")}</h2>
        <input
          suppressHydrationWarning
          value={commentId}
          onChange={(e) => setCommentId(e.target.value)}
          placeholder={t("placeholderCommentUuid")}
          className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={async () => {
            if (!commentId.trim() || !window.confirm(t("confirmDeleteComment")))
              return;
            const { ok, error } = await rpcAdminDeleteComment(commentId.trim());
            alert(ok ? tc("done") : error ?? tc("failed"));
            setCommentId("");
          }}
          className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white"
        >
          {tc("delete")}
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-300">
          {t("openReportsHeading")}
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("reportsEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-300"
              >
                <p>
                  {r.target_type} {r.target_id}
                </p>
                <p className="text-xs text-zinc-500">{r.reason}</p>
                <button
                  type="button"
                  className="mt-2 text-xs text-orange-400 hover:underline"
                  onClick={async () => {
                    await rpcAdminUpdateModerationReport({
                      reportId: r.id,
                      status: "resolved",
                    });
                    void load();
                  }}
                >
                  {t("markResolved")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
