"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { fetchAiAnalysisForVideo, type AiAnalysisRow } from "@/lib/supabase/aiAnalyses";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { mapAiAnalysisRowToScores } from "@/lib/ai/videoAiAnalysis";
import { AiAnalysisModal, AiAnalysisResultPanel } from "@/components/ai/AiAnalysisModal";
import { OwnerVideoAiActions } from "@/components/ai/OwnerVideoAiActions";

type Props = {
  videoId: string;
  ownerUserId: string;
};

export function PublicVideoDetailPanel({ videoId, ownerUserId }: Props) {
  const tAi = useTranslations("ai");
  const tVideo = useTranslations("publicVideo");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysisRow | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setViewerId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setViewerId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAnalysisError(null);
    void fetchAiAnalysisForVideo(videoId).then(({ row, errorMessage }) => {
      if (cancelled) return;
      setAnalysis(row);
      if (errorMessage) {
        setAnalysisError(errorMessage);
      }
    }).catch((err) => {
      logFullSupabaseError("[public video] fetchAiAnalysisForVideo", err, { videoId });
      if (!cancelled) setAnalysisError(tAi("loadError"));
    });
    return () => {
      cancelled = true;
    };
  }, [videoId, tAi]);

  const isOwner = Boolean(viewerId) && viewerId === ownerUserId;

  return (
    <section className="space-y-4 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary">
        {tVideo("captionLabel")}
      </h2>

      {analysis ? (
        <AiAnalysisResultPanel
          scores={mapAiAnalysisRowToScores(analysis)}
          onReanalyze={() => setAnalysisOpen(true)}
          reanalyzeBusy={false}
        />
      ) : isOwner ? (
        <OwnerVideoAiActions onAnalyze={() => setAnalysisOpen(true)} placement="leading" />
      ) : null}

      {analysisError ? (
        <p className="text-xs text-gn-text-secondary" role="status">
          {analysisError}
        </p>
      ) : null}

      {analysisOpen ? (
        <AiAnalysisModal
          open
          onClose={() => setAnalysisOpen(false)}
          videoId={videoId}
          viewerId={viewerId}
        />
      ) : null}
    </section>
  );
}
