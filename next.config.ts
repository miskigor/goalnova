import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * When you open the dev server from a phone via LAN (`http://192.168.x.x:3002`), the browser
 * sends `Origin` with that host. Next.js 14+ treats `/_next/*` fetches as cross-site unless the
 * hostname is allowlisted — otherwise hydration / client navigation silently break (looks like
 * “only the first page loads”). Wildcards follow Next’s `allowedDevOrigins` rules.
 *
 * iOS Safari on LAN still often fails that check; `npm run dev` sets
 * `NEXT_DISABLE_CROSS_SITE_DEV_BLOCK=1` (see `patches/next+16.2.2.patch`). Production `next start`
 * is unaffected.
 */
const lanDevOriginPatterns = [
  /** Loopback IPs (e.g. Safari at `http://127.0.0.1:3000` — unlike `localhost`, not in Next’s default list). */
  "127.*.*.*",
  "192.168.*.*",
  "10.*.*.*",
  /** Link-local / APIPA (sometimes used for direct device ↔ Mac debugging). */
  "169.254.*.*",
  "172.16.*.*",
  "172.17.*.*",
  "172.18.*.*",
  "172.19.*.*",
  "172.20.*.*",
  "172.21.*.*",
  "172.22.*.*",
  "172.23.*.*",
  "172.24.*.*",
  "172.25.*.*",
  "172.26.*.*",
  "172.27.*.*",
  "172.28.*.*",
  "172.29.*.*",
  "172.30.*.*",
  "172.31.*.*",
  "100.*.*.*",
  "*.local",
];

const extraAllowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

/** Extra hosts (no port), comma-separated — reinforces wildcards for iOS Safari + LAN. */
const explicitLanHosts =
  process.env.NEXT_DEV_LAN_HOST?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["next-intl"],
  },
  allowedDevOrigins: [
    ...lanDevOriginPatterns,
    ...explicitLanHosts,
    ...extraAllowedDevOrigins,
  ],
  // Native binaries for server-only video merge (API route); do not bundle with Turbopack.
  serverExternalPackages: ["ffmpeg-static", "@ffprobe-installer/ffprobe"],
  images: {
    // Logo uses quality={92}; Next 16 defaults to [75] only — without this, /_next/image returns 400 in production.
    qualities: [75, 92],
  },
};

export default withNextIntl(nextConfig);
