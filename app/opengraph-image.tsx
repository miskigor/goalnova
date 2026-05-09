import { ImageResponse } from "next/og";

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
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          backgroundColor: "#000",
          color: "#fff",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
        }}
      >
        <div
          style={{
            fontSize: 76,
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
            maxWidth: 900,
            lineHeight: 1.25,
          }}
        >
          Premium football talent discovery for scouts, clubs, and players.
        </div>
        <div
          style={{
            marginTop: 34,
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

