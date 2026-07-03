import type { MetadataRoute } from "next";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";

export default function robots(): MetadataRoute.Robots {
  const origin = (getServerSiteOrigin() ?? "https://pitchrusch.com").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private routes use `noindex` in layout/page metadata — not Disallow here.
        // Disallow + noindex blocks recrawl and causes GSC "indexed though blocked by robots.txt".
      },
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
