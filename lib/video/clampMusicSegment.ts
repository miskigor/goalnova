/** Minimum gap between music start and end (seconds). */
export const MUSIC_TRIM_MIN_GAP_SEC = 0.05;

/**
 * Enforces music_end > music_start, segment within track, and segment length ≤ video duration when known.
 */
export function constrainMusicTrimForUpload(args: {
  startSec: number;
  endSec: number;
  videoDurationSec: number | null;
  musicDurationSec: number | null;
}): { startSec: number; endSec: number; segmentLengthSec: number } {
  const md =
    args.musicDurationSec != null && args.musicDurationSec > 0
      ? args.musicDurationSec
      : null;
  const vd =
    args.videoDurationSec != null && args.videoDurationSec > 0
      ? args.videoDurationSec
      : null;

  const musicLen = md ?? 24 * 3600;
  const maxSegment = vd != null ? Math.min(vd, musicLen) : musicLen;
  const MIN = MUSIC_TRIM_MIN_GAP_SEC;

  let s = Number.isFinite(args.startSec) ? args.startSec : 0;
  let e = Number.isFinite(args.endSec) ? args.endSec : s + Math.min(maxSegment, musicLen - s);

  s = Math.max(0, Math.min(s, musicLen - MIN));
  e = Math.max(s + MIN, Math.min(e, musicLen));

  if (e - s > maxSegment) {
    e = s + maxSegment;
    e = Math.min(e, musicLen);
  }

  if (e <= s + MIN - 1e-9) {
    e = Math.min(musicLen, s + MIN);
  }

  if (vd != null && e - s > vd + 1e-9) {
    e = s + vd;
    e = Math.min(e, musicLen);
    if (e <= s + MIN - 1e-9) {
      s = Math.max(0, e - vd);
      s = Math.min(s, musicLen - MIN);
    }
  }

  const segmentLengthSec = Math.max(MIN, e - s);
  return { startSec: s, endSec: e, segmentLengthSec };
}

/**
 * Clamp music trim so the selected segment never exceeds video length (and stays in-track).
 */
export function clampMusicSegment(params: {
  videoDurationSec: number;
  musicDurationSec: number;
  startSec: number;
  endSec: number;
}): { startSec: number; endSec: number; segmentLengthSec: number } {
  const vd = Math.max(0.05, Math.min(params.videoDurationSec, 6 * 3600));
  const md = Math.max(0, params.musicDurationSec);

  let start = Number.isFinite(params.startSec) ? params.startSec : 0;
  let end = Number.isFinite(params.endSec) ? params.endSec : Math.min(md, vd);

  start = Math.max(0, start);
  if (md > 0) start = Math.min(start, Math.max(0, md - 0.05));

  if (!Number.isFinite(end) || end <= start) {
    end = start + Math.min(vd, Math.max(0.1, md - start));
  }

  end = Math.min(end, md > 0 ? md : start + vd);
  let seg = end - start;

  const maxFromStart = Math.min(vd, md > 0 ? md - start : vd);
  if (seg > maxFromStart) {
    end = start + maxFromStart;
    seg = end - start;
  }

  if (seg > vd) {
    end = start + vd;
    seg = vd;
  }

  if (seg < 0.05) {
    end = Math.min(md > 0 ? md : start + vd, start + Math.min(vd, 0.1));
    seg = Math.max(0.05, end - start);
  }

  return { startSec: start, endSec: end, segmentLengthSec: seg };
}

/** Default end timestamp on music timeline when start is 0. */
export function defaultMusicEndSec(
  musicDurationSec: number,
  videoDurationSec: number,
): number {
  const md = Math.max(0, musicDurationSec);
  const vd = Math.max(0.05, videoDurationSec);
  if (md <= 0.05) return vd;
  return Math.min(md, vd);
}
