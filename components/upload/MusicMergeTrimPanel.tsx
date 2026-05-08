"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatTrackDuration } from "@/lib/supabase/musicTracks";
import {
  constrainMusicTrimForUpload,
  MUSIC_TRIM_MIN_GAP_SEC,
} from "@/lib/video/clampMusicSegment";

type Props = {
  trackTitle: string;
  trackArtist?: string | null;
  videoDurationSec: number | null;
  musicDurationSec: number | null;
  musicStart: number;
  musicEnd: number;
  musicVolume: number;
  onTrimChange: (startSec: number, endSec: number) => void;
  onMusicVolumeChange: (v: number) => void;
  disabled: boolean;
};

/** m:ss for positions on the music timeline (floored seconds). */
function formatMmSs(totalSeconds: number): string {
  const sec = Math.max(0, totalSeconds);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDurationLabel(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  return formatTrackDuration(Math.floor(seconds));
}

const RANGE_CLASS =
  "h-3 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-gn-accent " +
  "disabled:cursor-not-allowed disabled:opacity-40 " +
  "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gn-accent " +
  "[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/40 " +
  "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-gn-accent";

export function MusicMergeTrimPanel({
  trackTitle,
  trackArtist,
  videoDurationSec,
  musicDurationSec,
  musicStart,
  musicEnd,
  musicVolume,
  onTrimChange,
  onMusicVolumeChange,
  disabled,
}: Props) {
  const t = useTranslations("music");

  const vd =
    videoDurationSec != null && videoDurationSec > 0 ? videoDurationSec : null;
  const md =
    musicDurationSec != null && musicDurationSec > 0 ? musicDurationSec : null;
  const musicLen = md ?? 600;

  const constrained = useMemo(
    () =>
      constrainMusicTrimForUpload({
        startSec: musicStart,
        endSec: musicEnd,
        videoDurationSec,
        musicDurationSec,
      }),
    [musicStart, musicEnd, videoDurationSec, musicDurationSec],
  );

  const { startSec, endSec, segmentLengthSec } = constrained;

  const vdEff = vd;
  const minEnd = musicStart + MUSIC_TRIM_MIN_GAP_SEC;
  const maxEnd = Math.min(musicLen, vdEff != null ? musicStart + vdEff : musicLen);

  const minStart = vdEff != null ? Math.max(0, musicEnd - vdEff) : 0;
  const maxStart = Math.min(
    musicLen - MUSIC_TRIM_MIN_GAP_SEC,
    musicEnd - MUSIC_TRIM_MIN_GAP_SEC,
  );

  const commit = useCallback(
    (rawStart: number, rawEnd: number) => {
      const next = constrainMusicTrimForUpload({
        startSec: rawStart,
        endSec: rawEnd,
        videoDurationSec,
        musicDurationSec,
      });
      onTrimChange(next.startSec, next.endSec);
    },
    [videoDurationSec, musicDurationSec, onTrimChange],
  );

  const onStartSlider = (v: number) => {
    commit(v, musicEnd);
  };

  const onEndSlider = (v: number) => {
    commit(musicStart, v);
  };

  const startSliderDead = maxStart <= minStart + 1e-6;
  const endSliderDead = maxEnd <= minEnd + 1e-6;
  const trimControlsDead = startSliderDead && endSliderDead;

  const p0 = musicLen > 0 ? (startSec / musicLen) * 100 : 0;
  const p1 = musicLen > 0 ? Math.max(0, ((endSec - startSec) / musicLen) * 100) : 0;
  const p2 = Math.max(0, 100 - p0 - p1);

  const timelineSummary = t("trimTimelineSummary", {
    start: formatMmSs(startSec),
    end: formatMmSs(endSec),
    total: formatMmSs(musicLen),
  });

  const segmentLive = t("segmentRangeLive", {
    start: formatMmSs(startSec),
    end: formatMmSs(endSec),
  });

  const segmentDurationStr = formatTrackDuration(Math.floor(segmentLengthSec));

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-gn-accent/25 bg-gn-accent/[0.06] p-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gn-accent/90">
          {t("mergeTrimHeading")}
        </p>
        <p className="text-sm font-semibold leading-snug text-white">{trackTitle}</p>
        {trackArtist?.trim() ? (
          <p className="text-xs text-white/55">{trackArtist.trim()}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/45">
            {t("videoDurationLabel")}
          </p>
          <p className="mt-0.5 tabular-nums text-sm font-medium text-white/90">
            {formatDurationLabel(videoDurationSec)}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/45">
            {t("musicDurationLabel")}
          </p>
          <p className="mt-0.5 tabular-nums text-sm font-medium text-white/90">
            {formatDurationLabel(musicDurationSec)}
          </p>
        </div>
        <div className="rounded-lg border border-gn-accent/30 bg-gn-accent/[0.08] px-3 py-2.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-gn-accent/80">
            {t("selectionLengthLabel")}
          </p>
          <p className="mt-0.5 tabular-nums text-sm font-semibold text-gn-accent">
            {segmentDurationStr}
          </p>
          {vdEff != null ? (
            <p className="mt-1 text-[0.65rem] leading-tight text-white/45">
              {t("segmentVsVideoTime", {
                segment: segmentDurationStr,
                video: formatMmSs(vdEff),
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/45">
          {t("trimTimelineTitle")}
        </p>
        <div
          className="space-y-1.5"
          role="group"
          aria-label={timelineSummary}
        >
          <div className="flex h-4 w-full overflow-hidden rounded-full ring-1 ring-white/10">
            <div
              className="h-full shrink-0 bg-white/[0.08]"
              style={{ width: `${p0}%` }}
              aria-hidden
            />
            <div
              className="h-full min-w-[6px] shrink-0 bg-gn-accent"
              style={{ width: `${p1}%` }}
              aria-hidden
            />
            <div
              className="h-full shrink-0 bg-white/[0.08]"
              style={{ width: `${p2}%` }}
              aria-hidden
            />
          </div>
          <div className="grid grid-cols-4 gap-x-1 text-center text-[0.65rem] tabular-nums leading-tight text-white/50">
            <span className="text-start">{formatMmSs(0)}</span>
            <span className="font-medium text-gn-accent/95">{formatMmSs(startSec)}</span>
            <span className="font-medium text-gn-accent/95">{formatMmSs(endSec)}</span>
            <span className="text-end">{formatMmSs(musicLen)}</span>
          </div>
          <div className="grid grid-cols-4 gap-x-1 text-center text-[0.58rem] leading-tight text-white/38">
            <span className="text-start">{t("trimAxisMin")}</span>
            <span>{t("trimTimelineLabelStart")}</span>
            <span>{t("trimTimelineLabelEnd")}</span>
            <span className="text-end">{t("trimAxisMax")}</span>
          </div>
        </div>
      </div>

      <p
        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-center text-xs font-medium tabular-nums text-gn-accent"
        aria-live="polite"
      >
        {segmentLive}
      </p>
      <p className="text-center text-[0.65rem] text-white/45">
        {t("segmentLengthDetail", { duration: segmentDurationStr })}
      </p>

      {trimControlsDead ? (
        <p className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center text-xs text-white/55">
          {t("trimRangeUnavailable")}
        </p>
      ) : (
        <div className="touch-manipulation space-y-4">
          {!startSliderDead ? (
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/45">
                  {t("trimStartSlider")}
                </span>
                <span className="tabular-nums text-sm font-medium text-white">
                  {formatMmSs(startSec)}
                </span>
              </div>
              <input
                suppressHydrationWarning
                type="range"
                className={RANGE_CLASS}
                min={minStart}
                max={Math.max(minStart + 0.01, maxStart)}
                step={0.1}
                value={Math.min(maxStart, Math.max(minStart, musicStart))}
                disabled={disabled}
                onChange={(e) => onStartSlider(Number.parseFloat(e.target.value))}
                aria-label={t("trimStartSlider")}
                aria-valuetext={formatMmSs(startSec)}
              />
            </div>
          ) : null}

          {!endSliderDead ? (
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/45">
                  {t("trimEndSlider")}
                </span>
                <span className="tabular-nums text-sm font-medium text-white">
                  {formatMmSs(endSec)}
                </span>
              </div>
              <input
                suppressHydrationWarning
                type="range"
                className={RANGE_CLASS}
                min={Math.min(minEnd, maxEnd - 0.01)}
                max={maxEnd}
                step={0.1}
                value={Math.min(maxEnd, Math.max(minEnd, musicEnd))}
                disabled={disabled}
                onChange={(e) => onEndSlider(Number.parseFloat(e.target.value))}
                aria-label={t("trimEndSlider")}
                aria-valuetext={formatMmSs(endSec)}
              />
            </div>
          ) : null}
        </div>
      )}

      <label className="block touch-manipulation text-left">
        <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-white/45">
          {t("musicVolumeLabel")} ({Math.round(musicVolume * 100)}%)
        </span>
        <input
          suppressHydrationWarning
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(musicVolume * 100)}
          disabled={disabled}
          onChange={(e) =>
            onMusicVolumeChange(Number.parseInt(e.target.value, 10) / 100)
          }
          className={`${RANGE_CLASS} mt-1`}
          aria-label={t("musicVolumeLabel")}
        />
      </label>

      {vdEff != null && segmentLengthSec > vdEff + 1e-3 ? (
        <p className="text-[11px] text-amber-400/95">{t("trimClampedHint")}</p>
      ) : null}
    </div>
  );
}
