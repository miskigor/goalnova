/**
 * Notifies search engines (Bing/Yandex/Seznam via IndexNow) after production deploy.
 * No Google Search Console or manual env vars required.
 * Key must match `public/pitchrusch2026indexnow.txt` and `lib/seo/indexNowConfig.ts`.
 */
const INDEXNOW_KEY = "pitchrusch2026indexnow";

const DEFAULT_ORIGIN = "https://pitchrusch.com";

const STATIC_PATHS = [
  "/",
  "/explore",
  "/challenges",
  "/rankings",
  "/search",
  "/contact",
  "/privacy",
  "/terms",
  "/content-policy",
  "/hr",
  "/de",
  "/hr/explore",
  "/hr/challenges",
];

function siteOrigin() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_ORIGIN;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return `${u.protocol}//${u.host}`;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

function shouldNotify() {
  if (process.env.INDEXNOW_DISABLE === "1" || process.env.INDEXNOW_DISABLE === "true") {
    return false;
  }
  const ctx = process.env.CONTEXT?.trim();
  if (ctx && ctx !== "production") return false;
  const origin = siteOrigin();
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return false;
  return true;
}

function priorityUrls(origin) {
  const base = origin.replace(/\/$/, "");
  return STATIC_PATHS.map((path) => (path === "/" ? base : `${base}${path}`));
}

async function submitIndexNow(origin, urlList) {
  const host = new URL(origin).host;
  const keyLocation = `${origin.replace(/\/$/, "")}/${INDEXNOW_KEY}.txt`;
  const body = JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation, urlList });

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (res.ok || res.status === 202) {
    console.log(`[indexnow] submitted ${urlList.length} URL(s) (${res.status})`);
    return;
  }

  const text = await res.text().catch(() => "");
  console.warn(`[indexnow] API returned ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
}

async function main() {
  if (!shouldNotify()) {
    console.log("[indexnow] skipped (non-production or disabled)");
    return;
  }

  const origin = siteOrigin();
  const urlList = priorityUrls(origin);

  try {
    await submitIndexNow(origin, urlList);
  } catch (err) {
    console.warn("[indexnow] notify failed (non-fatal):", err instanceof Error ? err.message : err);
  }
}

main();
