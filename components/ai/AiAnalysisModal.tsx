"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FlexibleMetricKey, VideoAnalysisScores } from "@/lib/ai/types";
import { FLEXIBLE_METRIC_ORDER, isAssessable } from "@/lib/ai/visibilityAnalysis";
import { useVideoAiAnalysis } from "@/lib/ai/useVideoAiAnalysis";
import { usePremium } from "@/components/premium/PremiumProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  videoId: string;
  databaseVideoIdMissing?: boolean;
  viewerId: string | null;
};

function LockGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LoadingState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-14 sm:py-16"
      role="status"
      aria-live="polite"
    >
      <div
        className="size-14 rounded-full border-2 border-gn-accent/25 border-t-gn-accent animate-spin"
        aria-hidden
      />
      <div className="space-y-1.5 text-center">
        <p className="text-base font-semibold text-gn-text">{title}</p>
        {subtitle ? (
          <p className="text-sm text-gn-text-secondary">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function formatActionChip(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type UiLocale =
  | "en"
  | "hr"
  | "de"
  | "bs"
  | "es"
  | "pt"
  | "sr"
  | "fr"
  | "it"
  | "nl"
  | "tr"
  | "ar";

const AI_UI_FALLBACK_TEXT: Record<
  UiLocale,
  {
    clipSummary: string;
    cameraNote: string;
    evidence: string;
    notAssessable: string;
    feedback: string;
    quality: { strong: string; adequate: string; limited: string };
  }
> = {
  en: {
    clipSummary: "Football actions are visible and assessed only where evidence is clear.",
    cameraNote: "Camera quality and angle affect confidence; unclear moments are not scored.",
    evidence: "Visible football action in this clip supports this score.",
    notAssessable: "This action is not clearly visible enough in this clip.",
    feedback:
      "This analysis is based only on clearly visible football actions. Focus on your lowest-rated metrics to improve your next clip.",
    quality: { strong: "strong", adequate: "adequate", limited: "limited" },
  },
  hr: {
    clipSummary: "Nogometne akcije su vidljive i ocijenjene samo gdje postoji jasan dokaz.",
    cameraNote: "Kvaliteta i kut kamere utječu na pouzdanost; nejasni dijelovi se ne ocjenjuju.",
    evidence: "Jasno vidljiva nogometna akcija podupire ovu ocjenu.",
    notAssessable: "Ova akcija nije dovoljno jasno vidljiva u ovom isječku.",
    feedback:
      "Analiza se temelji samo na jasno vidljivim nogometnim akcijama. Fokusiraj se na metrike s najnižom ocjenom za idući napredak.",
    quality: { strong: "jako", adequate: "solidno", limited: "ograničeno" },
  },
  de: {
    clipSummary: "Fußballaktionen sind sichtbar und wurden nur bei klarer Evidenz bewertet.",
    cameraNote: "Kameraqualität und Perspektive beeinflussen die Sicherheit; unklare Momente werden nicht bewertet.",
    evidence: "Sichtbare Fußballaktion im Clip stützt diese Bewertung.",
    notAssessable: "Diese Aktion ist in diesem Clip nicht klar genug sichtbar.",
    feedback:
      "Die Analyse basiert nur auf klar sichtbaren Fußballaktionen. Konzentriere dich auf die niedrigsten Metriken, um dich zu verbessern.",
    quality: { strong: "stark", adequate: "ausreichend", limited: "begrenzt" },
  },
  bs: {
    clipSummary: "Nogometne akcije su vidljive i ocijenjene samo kada postoji jasan dokaz.",
    cameraNote: "Kvalitet i ugao kamere utiču na pouzdanost; nejasni dijelovi se ne ocjenjuju.",
    evidence: "Jasno vidljiva nogometna akcija podržava ovu ocjenu.",
    notAssessable: "Ova akcija nije dovoljno jasno vidljiva u ovom klipu.",
    feedback:
      "Analiza je zasnovana samo na jasno vidljivim nogometnim akcijama. Fokusiraj se na metrike s najnižom ocjenom za napredak.",
    quality: { strong: "jako", adequate: "solidno", limited: "ograničeno" },
  },
  es: {
    clipSummary: "Las acciones de fútbol son visibles y se evaluaron solo donde la evidencia es clara.",
    cameraNote: "La calidad y el ángulo de cámara afectan la confianza; los momentos poco claros no se puntúan.",
    evidence: "La acción de fútbol visible en el clip respalda esta puntuación.",
    notAssessable: "Esta acción no se ve con suficiente claridad en este clip.",
    feedback:
      "Este análisis se basa solo en acciones de fútbol claramente visibles. Enfócate en las métricas más bajas para mejorar.",
    quality: { strong: "alta", adequate: "aceptable", limited: "limitada" },
  },
  pt: {
    clipSummary: "As ações de futebol estão visíveis e foram avaliadas apenas quando há evidência clara.",
    cameraNote: "A qualidade e o ângulo da câmara afetam a confiança; momentos pouco claros não são pontuados.",
    evidence: "A ação de futebol visível no clipe sustenta esta pontuação.",
    notAssessable: "Esta ação não está suficientemente visível neste clipe.",
    feedback:
      "Esta análise baseia-se apenas em ações de futebol claramente visíveis. Foque-se nas métricas mais baixas para evoluir.",
    quality: { strong: "forte", adequate: "adequada", limited: "limitada" },
  },
  sr: {
    clipSummary: "Fudbalske akcije su vidljive i ocenjene samo gde postoji jasan dokaz.",
    cameraNote: "Kvalitet i ugao kamere utiču na pouzdanost; nejasni delovi se ne ocenjuju.",
    evidence: "Jasno vidljiva fudbalska akcija podržava ovu ocenu.",
    notAssessable: "Ova akcija nije dovoljno jasno vidljiva u ovom klipu.",
    feedback:
      "Analiza je zasnovana samo na jasno vidljivim fudbalskim akcijama. Fokusiraj se na metrike sa najnižom ocenom za napredak.",
    quality: { strong: "jako", adequate: "solidno", limited: "ograničeno" },
  },
  fr: {
    clipSummary: "Les actions de football sont visibles et évaluées uniquement quand la preuve est claire.",
    cameraNote: "La qualité et l’angle de caméra influencent la confiance ; les moments flous ne sont pas notés.",
    evidence: "Une action de football visible dans le clip justifie cette note.",
    notAssessable: "Cette action n’est pas suffisamment visible dans ce clip.",
    feedback:
      "Cette analyse se base uniquement sur les actions clairement visibles. Concentre-toi sur les métriques les plus faibles pour progresser.",
    quality: { strong: "forte", adequate: "correcte", limited: "limitée" },
  },
  it: {
    clipSummary: "Le azioni calcistiche sono visibili e valutate solo dove l’evidenza è chiara.",
    cameraNote: "Qualità e angolo della camera influenzano la confidenza; i momenti poco chiari non vengono valutati.",
    evidence: "L’azione calcistica visibile nel clip supporta questo punteggio.",
    notAssessable: "Questa azione non è abbastanza visibile in questo clip.",
    feedback:
      "Questa analisi si basa solo su azioni calcistiche chiaramente visibili. Concentrati sulle metriche più basse per migliorare.",
    quality: { strong: "alta", adequate: "adeguata", limited: "limitata" },
  },
  nl: {
    clipSummary: "Voetbalacties zijn zichtbaar en alleen beoordeeld waar het bewijs duidelijk is.",
    cameraNote: "Camerakwaliteit en hoek beïnvloeden de betrouwbaarheid; onduidelijke momenten worden niet gescoord.",
    evidence: "Zichtbare voetbalactie in de clip ondersteunt deze score.",
    notAssessable: "Deze actie is niet duidelijk genoeg zichtbaar in deze clip.",
    feedback:
      "Deze analyse is alleen gebaseerd op duidelijk zichtbare voetbalacties. Focus op je laagste metrics om te verbeteren.",
    quality: { strong: "sterk", adequate: "voldoende", limited: "beperkt" },
  },
  tr: {
    clipSummary: "Klipte futbol aksiyonları görülüyor ve sadece açık kanıt olan kısımlar değerlendirildi.",
    cameraNote: "Kamera kalitesi ve açı güveni etkiler; belirsiz anlar puanlanmaz.",
    evidence: "Klipte görülen futbol aksiyonu bu puanı destekliyor.",
    notAssessable: "Bu aksiyon bu klipte yeterince net görünmüyor.",
    feedback:
      "Bu analiz yalnızca net görülen futbol aksiyonlarına dayanır. Gelişmek için en düşük metriklere odaklan.",
    quality: { strong: "yüksek", adequate: "yeterli", limited: "sınırlı" },
  },
  ar: {
    clipSummary: "تظهر لقطات كرة قدم في هذا المقطع وتم تقييم ما لديه دليل واضح فقط.",
    cameraNote: "جودة وزاوية الكاميرا تؤثران على الثقة؛ اللحظات غير الواضحة لا يتم تقييمها.",
    evidence: "اللقطة الكروية الظاهرة في الفيديو تدعم هذه الدرجة.",
    notAssessable: "هذه اللقطة غير واضحة بما يكفي للتقييم في هذا الفيديو.",
    feedback:
      "يعتمد هذا التحليل فقط على اللقطات الكروية الواضحة. ركّز على أقل المؤشرات لتحسين الأداء.",
    quality: { strong: "قوي", adequate: "مقبول", limited: "محدود" },
  },
};

function normalizeUiLocale(input: string): UiLocale {
  const base = input.toLowerCase().split("-")[0] as UiLocale;
  if (base in AI_UI_FALLBACK_TEXT) return base;
  return "en";
}

function shouldUseLocalizedFallback(text: string, locale: UiLocale): boolean {
  if (locale === "en") return false;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const markerMatches =
    normalized.match(
      /\b(the|clip|visible|ball|camera|score|only|not|no|appears|shown|through|with|without|pressure|attempt)\b/g,
    ) ?? [];
  if (markerMatches.length >= 2) return true;
  return /^(the|no|only)\b/.test(normalized);
}

function getLocalizedClipTypeLabel(t: ReturnType<typeof useTranslations>, clipType: string | null): string {
  if (!clipType) return "";
  switch (clipType) {
    case "training":
      return t("clipTypeTraining");
    case "match":
      return t("clipTypeMatch");
    case "skill":
      return t("clipTypeSkill");
    case "non_football":
      return t("clipTypeNonFootball");
    case "unclear":
      return t("clipTypeUnclear");
    case "other":
      return t("clipTypeOther");
    default:
      return clipType.replace(/_/g, " ");
  }
}

function ConfidenceMicro({
  value,
  label,
  lowLabel,
}: {
  value: number;
  label: string;
  lowLabel: string;
}) {
  const pct = Math.round(Math.min(100, Math.max(0, value * 100)));
  const low = value < 0.45;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          className={
            low ? "font-medium text-amber-300/95" : "text-gn-text-tertiary"
          }
        >
          {label}
          {low ? (
            <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/95">
              {lowLabel}
            </span>
          ) : null}
        </span>
        <span className="tabular-nums text-gn-text-secondary">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06]">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${
            low
              ? "bg-gradient-to-r from-amber-400/80 to-amber-500/60"
              : "bg-gradient-to-r from-gn-accent/80 to-gn-accent/50"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const v = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const pct = v;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-gn-text">{label}</span>
        <span className="tabular-nums text-sm font-semibold text-gn-accent">
          {Math.round(v)}
          <span className="text-gn-text-tertiary">/100</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gn-accent/90 to-gn-accent transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Renders saved or freshly computed scores (reusable layout). */
export function AiAnalysisResultPanel({
  scores,
  onReanalyze,
  reanalyzeBusy,
}: {
  scores: VideoAnalysisScores;
  onReanalyze: () => void;
  reanalyzeBusy: boolean;
}) {
  const locale = normalizeUiLocale(useLocale());
  const t = useTranslations("ai");
  const fb = AI_UI_FALLBACK_TEXT[locale];
  const localizedClipType = getLocalizedClipTypeLabel(t, scores.clip_type);
  const localizedInvalidReason =
    scores.clip_type === "non_football"
      ? t("invalidReasonNoFootballAction")
      : scores.clip_type === "unclear"
        ? t("invalidReasonUnclearFootballContext")
        : scores.invalid_reason;
  const localizedInvalidFeedback =
    scores.clip_type === "non_football"
      ? t("invalidFeedbackNoFootball")
      : scores.clip_type === "unclear"
        ? t("invalidFeedbackUnclear")
        : scores.feedback_text;
  const metricLabel = (key: FlexibleMetricKey) => {
    const labels: Record<FlexibleMetricKey, string> = {
      ball_control: t("metric.ball_control"),
      close_control: t("metric.close_control"),
      dribbling: t("metric.dribbling"),
      acceleration: t("metric.acceleration"),
      agility: t("metric.agility"),
      first_touch: t("metric.first_touch"),
      passing: t("metric.passing"),
      shooting: t("metric.shooting"),
      finishing: t("metric.finishing"),
      coordination: t("metric.coordination"),
      balance: t("metric.balance"),
      composure: t("metric.composure"),
      defending: t("metric.defending"),
      decision_making: t("metric.decision_making"),
    };
    return labels[key];
  };
  if (scores.valid_for_football_analysis === false) {
    return (
      <div className="space-y-5">
        <p className="text-center text-xs text-gn-text-tertiary">{t("fromSavedHint")}</p>

        <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-transparent p-5 text-center ring-1 ring-amber-500/25">
          <p className="text-sm font-semibold leading-snug text-amber-100">
            {t("notSuitableTitle")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/85">
            {t("notSuitableHint")}
          </p>
          {localizedInvalidReason ? (
            <p className="mt-4 text-left text-sm leading-relaxed text-amber-200/90">
              <span className="font-medium text-amber-100/90">{t("invalidReasonLabel")}: </span>
              {localizedInvalidReason}
            </p>
          ) : null}
          {localizedClipType ? (
            <p className="mt-3 text-xs text-amber-200/75">
              {t("clipTypeLabel")}:{" "}
              <span className="font-medium text-amber-100/90">
                {localizedClipType}
              </span>
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gn-text-tertiary">
            {t("feedback")}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gn-text">
            {localizedInvalidFeedback}
          </p>
        </div>

        <button
          type="button"
          disabled={reanalyzeBusy}
          onClick={onReanalyze}
          className="w-full rounded-xl border border-white/[0.12] py-3 text-sm font-medium text-gn-text transition-colors hover:bg-white/[0.05] disabled:opacity-50"
        >
          {reanalyzeBusy ? t("loading") : t("reanalyze")}
        </button>
      </div>
    );
  }

  const va = scores.visibility_analysis;
  const legacy = scores.legacy;
  const localizedClipSummary =
    va && shouldUseLocalizedFallback(va.clip_summary, locale)
      ? fb.clipSummary
      : va?.clip_summary ?? "";
  const localizedCameraNote =
    va && shouldUseLocalizedFallback(va.camera.assessment_note, locale)
      ? fb.cameraNote
      : va?.camera.assessment_note ?? "";
  const localizedFeedback =
    shouldUseLocalizedFallback(scores.feedback_text, locale)
      ? fb.feedback
      : scores.feedback_text;

  const assessed: FlexibleMetricKey[] = [];
  const skipped: FlexibleMetricKey[] = [];
  if (va) {
    for (const key of FLEXIBLE_METRIC_ORDER) {
      const m = va.metrics[key];
      if (!m) continue;
      if (isAssessable(m)) assessed.push(key);
      else skipped.push(key);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-xs text-gn-text-tertiary">{t("fromSavedHint")}</p>

      <div className="rounded-2xl border border-gn-accent/35 bg-gradient-to-br from-gn-accent/15 to-transparent p-5 text-center ring-1 ring-gn-accent/20">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gn-accent/90">
          {t("overallScore")}
        </p>
        <p className="mt-2 text-5xl font-bold tabular-nums tracking-tight text-gn-accent sm:text-6xl">
          {Math.round(scores.overall_score)}
        </p>
        <p className="mt-1 text-xs text-gn-text-tertiary">/ 100</p>
        {va ? (
          <div className="mx-auto mt-4 max-w-xs">
            <ConfidenceMicro
              value={scores.overall_confidence}
              label={t("overallConfidence")}
              lowLabel={t("lowConfidenceBadge")}
            />
          </div>
        ) : null}
      </div>

      {va ? (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gn-text-tertiary">
              {t("clipUnderstanding")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gn-text">
              {localizedClipSummary}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-gn-text-secondary">
                {va.clip_type.replace(/_/g, " ")}
              </span>
              {va.visible_actions.map((a) => (
                <span
                  key={a}
                  className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-gn-text-tertiary"
                >
                  {formatActionChip(a)}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-gn-text-tertiary">
              {t("cameraLabel")}
            </p>
            <p className="mt-1.5 text-sm text-gn-text-secondary">
              <span className="font-medium text-gn-text">
                {fb.quality[va.camera.quality]}
              </span>
              {" · "}
              {localizedCameraNote}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-gn-text-tertiary">
              {t("honestyNote")}
            </p>
          </div>

          {assessed.length > 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-gn-accent/90">
                {t("analyzedInThisClip")}
              </p>
              <div className="space-y-6">
                {assessed.map((key) => {
                  const m = va.metrics[key];
                  if (!m || m.status !== "assessable") return null;
                  const v = Math.min(100, Math.max(0, m.score));
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-gn-text">
                          {metricLabel(key)}
                        </span>
                        <span className="tabular-nums text-sm font-semibold text-gn-accent">
                          {Math.round(v)}
                          <span className="text-gn-text-tertiary">/100</span>
                        </span>
                      </div>
                      <ConfidenceMicro
                        value={m.confidence}
                        label={t("metricConfidence")}
                        lowLabel={t("lowConfidenceBadge")}
                      />
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gn-accent/90 to-gn-accent transition-[width] duration-700 ease-out"
                          style={{ width: `${v}%` }}
                        />
                      </div>
                      <p className="text-xs leading-relaxed text-gn-text-secondary">
                        <span className="font-medium text-gn-text-tertiary">
                          {t("evidenceLabel")}{" "}
                        </span>
                        {shouldUseLocalizedFallback(m.evidence, locale)
                          ? fb.evidence
                          : m.evidence}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {skipped.length > 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gn-text-tertiary">
                {t("notEnoughEvidenceHeading")}
              </p>
              <p className="mt-1 text-xs text-gn-text-tertiary">
                {t("notEnoughEvidenceHint")}
              </p>
              <div className="mt-4 space-y-4">
                {skipped.map((key) => {
                  const m = va.metrics[key];
                  if (!m || m.status !== "not_assessable") return null;
                  return (
                    <div key={key} className="border-t border-white/[0.06] pt-4 first:border-t-0 first:pt-0">
                      <p className="text-sm font-medium text-gn-text-secondary">
                        {metricLabel(key)}
                      </p>
                      <p className="mt-1 text-xs text-gn-text-tertiary">
                        {t("notScoredLabel")}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-gn-text-tertiary">
                        {shouldUseLocalizedFallback(m.reason, locale)
                          ? fb.notAssessable
                          : m.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      ) : legacy ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-gn-text-tertiary">
            {t("legacyScoresHeading")}
          </p>
          <div className="space-y-5">
            <ScoreRow label={t("speed")} value={legacy.speed} />
            <ScoreRow label={t("technique")} value={legacy.technique} />
            <ScoreRow
              label={t("decisionMaking")}
              value={legacy.decision_making}
            />
            <ScoreRow label={t("agility")} value={legacy.agility} />
            <ScoreRow label={t("shotPower")} value={legacy.shot_power} />
          </div>
          <p className="mt-4 text-xs text-gn-text-tertiary">{t("legacyScoresFootnote")}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gn-text-tertiary">
          {t("feedback")}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gn-text">
          {localizedFeedback}
        </p>
      </div>

      <button
        type="button"
        disabled={reanalyzeBusy}
        onClick={onReanalyze}
        className="w-full rounded-xl border border-white/[0.12] py-3 text-sm font-medium text-gn-text transition-colors hover:bg-white/[0.05] disabled:opacity-50"
      >
        {reanalyzeBusy ? t("loading") : t("reanalyze")}
      </button>
    </div>
  );
}

export function AiAnalysisModal({
  open,
  onClose,
  videoId,
  databaseVideoIdMissing = false,
  viewerId,
}: Props) {
  const t = useTranslations("ai");
  const tp = useTranslations("premium");
  const { isPremium, premiumLoaded: premiumStatusLoaded } = usePremium();

  const {
    scores,
    loadSavedBusy,
    runBusy,
    error,
    refreshSavedFromDb,
    reanalyze,
  } = useVideoAiAnalysis({
    open,
    videoId,
    viewerId,
    isPremium,
    premiumStatusLoaded,
    databaseVideoIdMissing,
  });

  if (!open) return null;

  const showAnalysisLoading =
    runBusy || (loadSavedBusy && !scores);
  const showResults = Boolean(scores) && !runBusy;
  const showErrorFull = Boolean(error) && !scores && !showAnalysisLoading;
  const showInitialCta =
    isPremium &&
    premiumStatusLoaded &&
    !databaseVideoIdMissing &&
    videoId.trim() &&
    !scores &&
    !showAnalysisLoading &&
    !error;

  const loadingTitle = runBusy
    ? t("analyzingPerformance")
    : t("loadingSavedAnalysis");
  const loadingSubtitle = runBusy ? t("analyzingSubtle") : t("loadingSubtle");

  return (
    <div
      className="fixed inset-0 z-[100] flex min-w-0 items-end justify-center bg-black/70 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-analysis-title"
      onClick={onClose}
    >
      <div
        className="box-border max-h-[min(92dvh,720px)] w-full min-w-0 max-w-md overflow-y-auto overflow-x-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#14161c] to-gn-bg shadow-2xl shadow-black/50 sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#14161c]/95 px-4 py-3.5 backdrop-blur-sm sm:px-5">
          <h2
            id="ai-analysis-title"
            className="text-lg font-semibold tracking-tight text-gn-text"
          >
            {t("modalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gn-text-secondary transition-colors hover:bg-white/[0.06] hover:text-gn-text"
          >
            {t("close")}
          </button>
        </div>

        <div className="px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
          {!viewerId ? (
            <p className="py-6 text-center text-sm text-gn-text-secondary">
              {t("loginRequired")}
            </p>
          ) : databaseVideoIdMissing || !videoId.trim() ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-center">
              <p className="text-sm font-medium leading-relaxed text-gn-accent" role="alert">
                {t("missingVideoIdBody")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full rounded-xl border border-white/[0.1] py-3 text-sm font-medium text-gn-text transition-colors hover:bg-white/[0.05]"
              >
                {t("close")}
              </button>
            </div>
          ) : !isPremium || !premiumStatusLoaded ? (
            <div className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
              {!premiumStatusLoaded ? (
                <LoadingState
                  title={t("checkingPremium")}
                  subtitle={t("loadingSubtle")}
                />
              ) : (
                <>
                  <div
                    className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/[0.06] text-gn-text-tertiary"
                    aria-hidden
                  >
                    <LockGlyph className="size-7" />
                  </div>
                  <p className="text-base font-semibold leading-snug text-gn-text">
                    {t("premiumFeatureNotice")}
                  </p>
                  <p className="text-sm leading-relaxed text-gn-text-secondary">
                    {t("premiumLockedBody")}
                  </p>
                  <Link
                    href="/premium"
                    onClick={onClose}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-gn-accent py-3.5 text-sm font-semibold text-gn-bg transition-opacity hover:opacity-92"
                  >
                    {tp("cta")}
                  </Link>
                  <p className="text-xs leading-relaxed text-gn-text-tertiary">
                    {t("unlockFooterHint")}
                  </p>
                </>
              )}
            </div>
          ) : showAnalysisLoading ? (
            <LoadingState title={loadingTitle} subtitle={loadingSubtitle} />
          ) : showErrorFull ? (
            <div className="space-y-5 rounded-xl border border-gn-accent/25 bg-gn-accent/[0.06] p-6 text-center">
              <p className="text-sm font-semibold text-gn-accent" role="alert">
                {t("errorTitle")}
              </p>
              <p className="text-sm leading-relaxed text-gn-text-secondary">
                {error}
              </p>
              <button
                type="button"
                disabled={loadSavedBusy}
                aria-busy={loadSavedBusy}
                onClick={() => void refreshSavedFromDb()}
                className="w-full rounded-xl bg-gn-accent py-3.5 text-sm font-semibold text-gn-bg transition-opacity hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadSavedBusy ? t("loadingExisting") : t("tryAgain")}
              </button>
            </div>
          ) : showResults && scores ? (
            <div className="space-y-5">
              {error ? (
                <p
                  className="rounded-lg border border-gn-accent/30 bg-gn-accent/10 px-3 py-2 text-center text-sm text-gn-accent"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <AiAnalysisResultPanel
                scores={scores}
                onReanalyze={() => void reanalyze()}
                reanalyzeBusy={runBusy}
              />
            </div>
          ) : showInitialCta ? (
            <div className="space-y-5 py-2">
              <p className="text-center text-sm text-gn-text-secondary">
                {t("runAnalysisIntro")}
              </p>
              <button
                type="button"
                disabled={runBusy}
                aria-busy={runBusy}
                onClick={() => void reanalyze()}
                className="w-full rounded-xl bg-gn-accent py-3.5 text-sm font-semibold text-gn-bg shadow-lg shadow-gn-accent/20 transition-opacity hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {runBusy ? t("runningAnalysis") : t("runAnalysis")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
