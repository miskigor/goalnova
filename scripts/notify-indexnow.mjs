/**
 * Notifies search engines (Bing/Yandex/Seznam via IndexNow) after production deploy.
 * Fetches live sitemap.xml and submits discovered URLs in batches.
 */
const INDEXNOW_KEY = "pitchrusch2026indexnow";

const DEFAULT_ORIGIN = "https://pitchrusch.com";
const INDEXNOW_BATCH_SIZE = 100;
const INDEXNOW_MAX_URLS = 500;

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

function parseSitemapLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    locs.push(match[1].trim());
  }
  return locs;
}

async function fetchSitemapUrls(origin) {
  const sitemapUrl = `${origin.replace(/\/$/, "")}/sitemap.xml`;
  const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    throw new Error(`sitemap fetch ${res.status}`);
  }
  const xml = await res.text();
  const urls = parseSitemapLocs(xml);
  if (urls.length === 0) {
    throw new Error("sitemap empty");
  }
  return urls.slice(0, INDEXNOW_MAX_URLS);
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
  let urls;
  try {
    urls = await fetchSitemapUrls(origin);
    console.log(`[indexnow] loaded ${urls.length} URL(s) from sitemap`);
  } catch (err) {
    console.warn("[indexnow] sitemap fetch failed; skipping notify:", err instanceof Error ? err.message : err);
    return;
  }

  for (let i = 0; i < urls.length; i += INDEXNOW_BATCH_SIZE) {
    const batch = urls.slice(i, i + INDEXNOW_BATCH_SIZE);
    try {
      await submitIndexNow(origin, batch);
    } catch (err) {
      console.warn("[indexnow] notify failed (non-fatal):", err instanceof Error ? err.message : err);
      break;
    }
  }
}

main();
