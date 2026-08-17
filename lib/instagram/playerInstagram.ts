/** Normalize Instagram usernames and open the profile in the Instagram app when possible. */

const HANDLE_RE = /^[a-z0-9._]{1,30}$/i;
const SKIP_SEGMENTS = new Set(["p", "reel", "reels", "stories", "explore", "tv", "accounts"]);

export function parseInstagramHandle(raw: string | null | undefined): string | null {
  let value = String(raw ?? "").trim();
  if (!value) return null;
  value = value.replace(/^@+/, "");
  value = value.replace(/^https?:\/\//i, "");
  value = value.replace(/^www\./i, "");
  const lower = value.toLowerCase();
  if (lower.startsWith("instagram.com/")) {
    value = value.slice("instagram.com/".length);
  } else if (lower.startsWith("instagr.am/")) {
    value = value.slice("instagr.am/".length);
  }
  value = value.replace(/^\/+/, "");
  value = value.split("?")[0]?.split("#")[0] ?? "";
  const parts = value.split("/").filter(Boolean);
  const first = parts[0] ?? "";
  const handle =
    first.toLowerCase() === "_u" ? (parts[1] ?? "") : SKIP_SEGMENTS.has(first.toLowerCase()) ? "" : first;
  const normalized = handle.replace(/\/+$/, "").trim();
  if (!HANDLE_RE.test(normalized)) return null;
  if (normalized.startsWith(".") || normalized.endsWith(".")) return null;
  return normalized;
}

export function instagramHttpsUrl(handle: string): string {
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}

export function instagramAppUrl(handle: string): string {
  return `instagram://user?username=${encodeURIComponent(handle)}`;
}

function isMobileUserAgent(ua: string): boolean {
  return /iPhone|iPad|iPod|Android/i.test(ua);
}

/** Opens the Instagram app on phones when installed; otherwise the Instagram website. */
export function openInstagramProfile(handle: string): void {
  const httpsUrl = instagramHttpsUrl(handle);
  if (typeof window === "undefined") return;
  const ua = window.navigator.userAgent;
  if (!isMobileUserAgent(ua)) {
    window.open(httpsUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const started = Date.now();
  const fallback = window.setTimeout(() => {
    if (Date.now() - started < 1600) {
      window.location.href = httpsUrl;
    }
  }, 650);
  window.addEventListener(
    "pagehide",
    () => {
      window.clearTimeout(fallback);
    },
    { once: true },
  );
  window.location.href = instagramAppUrl(handle);
}

export function instagramDisplayHandle(handle: string): string {
  return `@${handle}`;
}
