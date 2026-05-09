import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "72px 82px",
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
            gap: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            <div
              style={{
                fontSize: 70,
                fontWeight: 800,
                letterSpacing: -1.5,
                lineHeight: 1.05,
              }}
            >
              PitchRusch
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 32,
                fontWeight: 600,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.25,
              }}
            >
              Discover football talent. Built for scouts and clubs.
            </div>
          </div>
          <div
            style={{
              width: 170,
              height: 170,
              borderRadius: 42,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
              color: "#0a0a0a",
              fontWeight: 900,
              fontSize: 72,
              letterSpacing: -3,
            }}
          >
            PR
          </div>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            fontWeight: 700,
            color: "#f97316",
          }}
        >
          pitchrusch.com
        </div>
      </div>
    ),
    size,
  );
}

