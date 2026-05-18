"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { fetchAiAnalysisForVideo, type AiAnalysisRow } from "@/lib/supabase/aiAnalyses";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { mapAiAnalysisRowToScores } from "@/lib/ai/videoAiAnalysis";
import { AiAnalysisModal, AiAnalysisResultPanel } from "@/components/ai/AiAnalysisModal";
import { OwnerVideoAiActions } from "@/components/ai/OwnerVideoAiActions";
import { ScoutAiInsightBlock } from "@/components/scout/ScoutAiInsightBlock";

type Props = {
  videoId: string;
  ownerUserId: string;
};

export function PublicVideoDetailPanel({ videoId, ownerUserId }: Props) {
  const tAi = useTranslations("ai");
  const tVideo = useTranslations("publicVideo");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysisRow | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null;
      if (cancelled) return;
      setViewerId(uid);
      if (!uid) {
        setViewerRole(null);
        return;
      }
      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", uid)
        .maybeSingle();
      if (!cancelled) {
        setViewerRole(String(userRow?.role ?? "").trim() || null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setViewerId(uid);
      if (!uid) {
        setViewerRole(null);
        return;
      }
      void supabase
        .from("users")
        .select("role")
        .eq("id", uid)
        .maybeSingle()
        .then(({ data: userRow }) => {
          setViewerRole(String(userRow?.role ?? "").trim() || null);
        });
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
  const isScoutViewer = viewerRole === "scout";

  return (
    <section className="space-y-4 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary">
        {tVideo("captionLabel")}
      </h2>

      {isScoutViewer ? (
        <ScoutAiInsightBlock
          videoId={videoId}
          viewerId={viewerId}
          initialAnalysis={analysis}
          onAnalysisChange={setAnalysis}
        />
      ) : analysis ? (
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

      {analysisOpen && !isScoutViewer ? (
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
