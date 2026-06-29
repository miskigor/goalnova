/** Instagram, Facebook, TikTok and similar embedded browsers often block third-party auth APIs. */
export function isLikelyInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|BytedanceWebview|TikTok|Snapchat/i.test(ua);
}
