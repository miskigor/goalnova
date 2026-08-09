/** localStorage keys for PitchRusch PWA install UX. */

export const PWA_STORAGE = {
  visitCount: "pitchrusch.pwa.visitCount",
  sessionCounted: "pitchrusch.pwa.sessionCounted",
  laterUntil: "pitchrusch.pwa.laterUntil",
  postRegistrationPending: "pitchrusch.pwa.postRegistrationPending",
  postFirstVideoPending: "pitchrusch.pwa.postFirstVideoPending",
  postFirstVideoShown: "pitchrusch.pwa.postFirstVideoShown",
  notifPromptLaterUntil: "pitchrusch.pwa.notifPromptLaterUntil",
  notifPromptDone: "pitchrusch.pwa.notifPromptDone",
} as const;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readVisitCount(): number {
  if (!canUseStorage()) return 0;
  const raw = window.localStorage.getItem(PWA_STORAGE.visitCount);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Count at most once per browser tab session. Returns updated total. */
export function recordAppVisit(): number {
  if (!canUseStorage()) return 0;
  try {
    if (window.sessionStorage.getItem(PWA_STORAGE.sessionCounted) === "1") {
      return readVisitCount();
    }
    window.sessionStorage.setItem(PWA_STORAGE.sessionCounted, "1");
  } catch {
    /* private mode */
  }
  const next = readVisitCount() + 1;
  window.localStorage.setItem(PWA_STORAGE.visitCount, String(next));
  return next;
}

export function snoozeInstallPrompt(days = 7): void {
  if (!canUseStorage()) return;
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(PWA_STORAGE.laterUntil, String(until));
}

export function isInstallPromptSnoozed(): boolean {
  if (!canUseStorage()) return false;
  const raw = window.localStorage.getItem(PWA_STORAGE.laterUntil);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  if (Date.now() >= until) {
    window.localStorage.removeItem(PWA_STORAGE.laterUntil);
    return false;
  }
  return true;
}

export function markPostRegistrationPending(): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PWA_STORAGE.postRegistrationPending, "1");
}

export function hasPostRegistrationPending(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(PWA_STORAGE.postRegistrationPending) === "1";
}

export function clearPostRegistrationPending(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(PWA_STORAGE.postRegistrationPending);
}

export function markPostFirstVideoPending(): void {
  if (!canUseStorage()) return;
  if (window.localStorage.getItem(PWA_STORAGE.postFirstVideoShown) === "1") return;
  window.localStorage.setItem(PWA_STORAGE.postFirstVideoPending, "1");
}

export function hasPostFirstVideoPending(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(PWA_STORAGE.postFirstVideoPending) === "1";
}

/** Clears the pending flag without marking the screen as permanently shown. */
export function clearPostFirstVideoPending(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(PWA_STORAGE.postFirstVideoPending);
}

export function markPostFirstVideoScreenSeen(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(PWA_STORAGE.postFirstVideoPending);
  window.localStorage.setItem(PWA_STORAGE.postFirstVideoShown, "1");
}

export function snoozeNotificationPrompt(days = 7): void {
  if (!canUseStorage()) return;
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(PWA_STORAGE.notifPromptLaterUntil, String(until));
}

export function isNotificationPromptSnoozed(): boolean {
  if (!canUseStorage()) return false;
  const raw = window.localStorage.getItem(PWA_STORAGE.notifPromptLaterUntil);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  if (Date.now() >= until) {
    window.localStorage.removeItem(PWA_STORAGE.notifPromptLaterUntil);
    return false;
  }
  return true;
}

export function markNotificationPromptDone(): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PWA_STORAGE.notifPromptDone, "1");
  window.localStorage.removeItem(PWA_STORAGE.notifPromptLaterUntil);
}

export function isNotificationPromptDone(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(PWA_STORAGE.notifPromptDone) === "1";
}

export const PWA_LATER_MS = SEVEN_DAYS_MS;
