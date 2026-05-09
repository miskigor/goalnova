import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
            boxShadow: "0 0 90px rgba(249,115,22,0.45)",
            color: "#0a0a0a",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
            fontWeight: 900,
            fontSize: 170,
            letterSpacing: -8,
          }}
        >
          PR
        </div>
      </div>
    ),
    size,
  );
}

