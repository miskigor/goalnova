import type { MetadataRoute } from "next";
import { privateDisallowPaths } from "@/lib/seo/privateRobots";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";

export default function robots(): MetadataRoute.Robots {
  const origin = getServerSiteOrigin() ?? "https://pitchrusch.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateDisallowPaths(),
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
