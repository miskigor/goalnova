/**
 * Pings Google and Bing with the sitemap URL after production deploy.
 * Complements IndexNow (Bing/Yandex) — helps crawlers discover URL changes faster.
 */
const DEFAULT_ORIGIN = "https://pitchrusch.com";

function siteOrigin() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_ORIGIN;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return `${u.protocol}//${u.host}`;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

function shouldPing() {
  if (process.env.SITEMAP_PING_DISABLE === "1" || process.env.SITEMAP_PING_DISABLE === "true") {
    return false;
  }
  const ctx = process.env.CONTEXT?.trim();
  if (ctx && ctx !== "production") return false;
  const origin = siteOrigin();
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return false;
  return true;
}

async function pingEngine(label, pingBase, sitemapUrl) {
  const url = `${pingBase}${encodeURIComponent(sitemapUrl)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  console.log(`[sitemap-ping] ${label} ${res.status}`);
}

async function main() {
  if (!shouldPing()) {
    console.log("[sitemap-ping] skipped (non-production or disabled)");
    return;
  }

  const origin = siteOrigin().replace(/\/$/, "");
  const sitemapUrl = `${origin}/sitemap.xml`;

  try {
    await Promise.allSettled([
      pingEngine("google", "https://www.google.com/ping?sitemap=", sitemapUrl),
      pingEngine("bing", "https://www.bing.com/ping?sitemap=", sitemapUrl),
    ]);
  } catch (err) {
    console.warn("[sitemap-ping] failed (non-fatal):", err instanceof Error ? err.message : err);
  }
}

main();
