import { ImageResponse } from "next/og";
import { SITE_SEO_OG_TAGLINE } from "@/lib/seo/brandMetadata";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "86px 90px",
          backgroundColor: "#000",
          color: "#fff",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 34,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 790 }}>
            <div
              style={{
                fontSize: 78,
                fontWeight: 800,
                letterSpacing: -1.5,
                lineHeight: 1.05,
              }}
            >
              PitchRusch
            </div>
            <div
              style={{
                marginTop: 22,
                fontSize: 34,
                fontWeight: 600,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.25,
              }}
            >
              {SITE_SEO_OG_TAGLINE}
            </div>
          </div>
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
              boxShadow: "0 0 70px rgba(249,115,22,0.38)",
              color: "#0a0a0a",
              fontWeight: 900,
              fontSize: 96,
              letterSpacing: -4,
            }}
          >
            PR
          </div>
        </div>
        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: "#f97316",
              boxShadow: "0 0 40px rgba(249,115,22,0.35)",
            }}
          />
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#f97316",
            }}
          >
            pitchrusch.com
          </div>
        </div>
      </div>
    ),
    size,
  );
}

