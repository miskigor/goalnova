export type TimeRemainingParts = {
  totalMs: number;
  expired: boolean;
  /** Short label e.g. "3d 4h" or "Ended" */
  label: string;
};

/** Human-readable time left until `expiresAt`, or ended state. */
export function timeRemainingUntil(expiresAt: string | null | undefined): TimeRemainingParts | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  const now = Date.now();
  const totalMs = end - now;
  if (totalMs <= 0) {
    return { totalMs: 0, expired: true, label: "" };
  }
  const sec = Math.floor(totalMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) {
    const h = hr % 24;
    return {
      totalMs,
      expired: false,
      label: h > 0 ? `${day}d ${h}h` : `${day}d`,
    };
  }
  if (hr >= 1) {
    const m = min % 60;
    return {
      totalMs,
      expired: false,
      label: m > 0 ? `${hr}h ${m}m` : `${hr}h`,
    };
  }
  if (min >= 1) {
    return { totalMs, expired: false, label: `${min}m` };
  }
  return { totalMs, expired: false, label: "<1m" };
}
