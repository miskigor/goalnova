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
          flexDirection: "column",
          justifyContent: "center",
          padding: 92,
          backgroundColor: "#000",
          color: "#fff",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
        }}
      >
        <div
          style={{
            fontSize: 72,
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
            maxWidth: 920,
            lineHeight: 1.25,
          }}
        >
          Discover football talent. Built for scouts and clubs.
        </div>
        <div
          style={{
            marginTop: 30,
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

