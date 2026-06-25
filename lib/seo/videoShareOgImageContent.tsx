import { APP_DISPLAY_NAME } from "@/lib/constants/brand";

type VideoShareOgImageContentProps = {
  thumbnailSrc: string;
  logoSrc: string;
  title: string;
};

/** OG preview for shared video links — thumbnail with PitchRusch logo badge. */
export function VideoShareOgImageContent({
  thumbnailSrc,
  logoSrc,
  title,
}: VideoShareOgImageContentProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "#000",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailSrc}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.88) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 36,
          right: 36,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 18px",
          borderRadius: 20,
          backgroundColor: "rgba(0,0,0,0.62)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          width={52}
          height={52}
          style={{ width: 52, height: 52, objectFit: "contain" }}
        />
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: -0.5,
          }}
        >
          {APP_DISPLAY_NAME}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 48,
          right: 48,
          bottom: 42,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.15,
            letterSpacing: -0.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxHeight: 96,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#f97316",
          }}
        >
          pitchrusch.com
        </div>
      </div>
    </div>
  );
}
