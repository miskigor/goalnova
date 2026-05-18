"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AiAnalysisModal, AiAnalysisResultPanel } from "@/components/ai/AiAnalysisModal";
import { mapAiAnalysisRowToScores } from "@/lib/ai/videoAiAnalysis";
import { useScoutAiInsightAccess } from "@/hooks/useScoutAiInsightAccess";
import {
  fetchScoutAiInsightAccess,
  isScoutAiPreviewLimitError,
  isScoutVerificationRequiredError,
} from "@/lib/supabase/scoutAiInsight";
import { fetchAiAnalysisForVideo, type AiAnalysisRow } from "@/lib/supabase/aiAnalyses";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

type Props = {
  videoId: string;
  viewerId: string | null;
  initialAnalysis?: AiAnalysisRow | null;
  onAnalysisChange?: (row: AiAnalysisRow | null) => void;
};

export function ScoutAiInsightBlock({
  videoId,
  viewerId,
  initialAnalysis = null,
  onAnalysisChange,
}: Props) {
  const t = useTranslations("scoutAiInsight");
  const gate = useScoutAiInsightAccess(videoId);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingRunInModal, setPendingRunInModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysisRow | null>(initialAnalysis);

  useEffect(() => {
    setAnalysis(initialAnalysis);
  }, [initialAnalysis]);

  const syncAnalysis = useCallback(
    (row: AiAnalysisRow | null) => {
      setAnalysis(row);
      onAnalysisChange?.(row);
    },
    [onAnalysisChange],
  );

  if (!gate.loaded || gate.isPlayer || (!gate.isScout && !gate.isStaff)) {
    return null;
  }

  if (gate.isUnverifiedScout) {
    return (
      <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3 text-sm text-gn-text-secondary">
        <p>{t("verificationRequired")}</p>
        <Link
          href="/scout-apply"
          className="mt-2 inline-flex font-medium text-gn-accent hover:underline"
        >
          {t("completeVerification")}
        </Link>
      </div>
    );
  }

  if (!gate.isApprovedScout || !viewerId) {
    return null;
  }

  const access = gate.access;
  const existingAnalysis = Boolean(analysis) || Boolean(access?.existingAnalysis);
  const isPro = access?.isScoutPro ?? gate.isStaff;
  const previewsLeft = access?.previewsLeft ?? 0;
  const previewsLimit = access?.previewsLimit ?? 3;
  const limitReached = !isPro && !existingAnalysis && !access?.canRun;

  const openView = () => {
    setActionError(null);
    setPendingRunInModal(false);
    setModalOpen(true);
  };

  const openRun = async () => {
    setActionError(null);
    const consume = await fetchScoutAiInsightAccess({ videoId, forRun: true });
    if (consume.errorMessage) {
      if (isScoutVerificationRequiredError(consume.errorMessage)) {
        setActionError(t("verificationRequired"));
        return;
      }
      if (isScoutAiPreviewLimitError(consume.errorMessage)) {
        setActionError(t("upgradeBody"));
        return;
      }
      setActionError(t("actionFailed"));
      return;
    }
    if (!consume.data?.ok) {
      setActionError(t("actionFailed"));
      return;
    }
    if (consume.data.existingAnalysis) {
      const { row } = await fetchAiAnalysisForVideo(videoId);
      if (row) syncAnalysis(row);
      openView();
      return;
    }
    if (!consume.data.canRun) {
      setActionError(t("upgradeBody"));
      return;
    }
    setPendingRunInModal(true);
    setModalOpen(true);
  };

  const handleBeforeReanalyze = async (): Promise<boolean> => {
    if (pendingRunInModal) {
      setPendingRunInModal(false);
      return true;
    }
    const consume = await fetchScoutAiInsightAccess({ videoId, forRun: true });
    if (consume.errorMessage) {
      if (isScoutAiPreviewLimitError(consume.errorMessage)) {
        setActionError(t("upgradeBody"));
        return false;
      }
      if (isScoutVerificationRequiredError(consume.errorMessage)) {
        setActionError(t("verificationRequired"));
        return false;
      }
      setActionError(t("actionFailed"));
      return false;
    }
    if (!consume.data?.ok || !consume.data.canRun) {
      setActionError(t("actionFailed"));
      return false;
    }
    return true;
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setPendingRunInModal(false);
    void fetchAiAnalysisForVideo(videoId).then(({ row }) => {
      if (row) syncAnalysis(row);
    });
    void gate.refresh();
  };

  return (
    <div className="box-border w-full min-w-0 max-w-full space-y-3 overflow-x-clip rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gn-accent">
        {t("title")}
      </h3>

      {analysis ? (
        <AiAnalysisResultPanel
          scores={mapAiAnalysisRowToScores(analysis)}
          onReanalyze={() => openView()}
          reanalyzeBusy={false}
        />
      ) : null}

      {limitReached ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gn-text">{t("upgradeTitle")}</p>
          <p className="text-sm text-gn-text-secondary">{t("upgradeBody")}</p>
          <Link href="/premium" className={`${GN_PRIMARY_BUTTON_CLASS} inline-flex w-full justify-center`}>
            {t("upgradeCta")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {!isPro && !existingAnalysis ? (
            <p className="text-xs text-gn-text-tertiary">
              {t("previewsLeft", { count: previewsLeft, limit: previewsLimit })}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void (existingAnalysis ? openView() : openRun())}
            className={`${GN_PRIMARY_BUTTON_CLASS} w-full`}
          >
            {existingAnalysis ? t("view") : t("run")}
          </button>
        </div>
      )}

      {actionError ? (
        <p className="text-xs text-gn-accent" role="alert">
          {actionError}
        </p>
      ) : null}

      {modalOpen ? (
        <AiAnalysisModal
          open
          onClose={handleModalClose}
          videoId={videoId}
          viewerId={viewerId}
          skipPremiumGate
          titleOverride={t("title")}
          onBeforeReanalyze={handleBeforeReanalyze}
        />
      ) : null}
    </div>
  );
}
