/** Instagram, Facebook, TikTok and similar embedded browsers often block third-party auth APIs. */
const IN_APP_BROWSER_UA_RE =
  /Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|BytedanceWebview|TikTok|Snapchat/i;

export const GN_IN_APP_BROWSER_ATTR = "data-gn-in-app-browser";

export function isLikelyInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return IN_APP_BROWSER_UA_RE.test(navigator.userAgent || "");
}

/** Sets `data-gn-in-app-browser` on `<html>` so CSS can hide fixed chrome. */
export function syncInAppBrowserDocumentFlag(): boolean {
  if (typeof document === "undefined") return false;
  const active = isLikelyInAppBrowser();
  const root = document.documentElement;
  if (active) {
    root.setAttribute(GN_IN_APP_BROWSER_ATTR, "");
    root.style.setProperty("--gn-app-bottom-nav-offset", "0px");
  } else {
    root.removeAttribute(GN_IN_APP_BROWSER_ATTR);
    root.style.removeProperty("--gn-app-bottom-nav-offset");
  }
  return active;
}
