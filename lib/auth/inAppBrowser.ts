/** Instagram, Facebook, TikTok and similar embedded browsers often break forms / auth. */
export function isLikelyInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|BytedanceWebview|TikTok|Snapchat/i.test(
    ua,
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function toAbsoluteUrl(url: string): string {
  if (typeof window === "undefined") return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${window.location.origin}${url}`;
  return window.location.href;
}

/**
 * Hand the page to the real system browser (Safari / Chrome).
 * Needs a user tap on many Instagram builds.
 */
export function openInSystemBrowser(
  url = typeof window !== "undefined" ? window.location.href : "",
): boolean {
  if (typeof window === "undefined" || !url) return false;
  const absolute = toAbsoluteUrl(url);

  try {
    if (isIos()) {
      // Opens Safari from Instagram / Facebook / TikTok webviews on iOS.
      const safariUrl = absolute
        .replace(/^https:\/\//i, "x-safari-https://")
        .replace(/^http:\/\//i, "x-safari-http://");
      window.location.href = safariUrl;
      return true;
    }

    if (isAndroid()) {
      const stripped = absolute.replace(/^https?:\/\//i, "");
      const intentUrl =
        `intent://${stripped}` +
        "#Intent;scheme=https;action=android.intent.action.VIEW;" +
        "S.browser_fallback_url=" +
        encodeURIComponent(absolute) +
        ";end";
      window.location.href = intentUrl;
      return true;
    }

    window.open(absolute, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    return false;
  }
}
