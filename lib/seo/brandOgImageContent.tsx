import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { SITE_SEO_OG_TAGLINE } from "@/lib/seo/brandMetadata";

type BrandOgImageContentProps = {
  logoSrc: string;
  width: number;
  height: number;
};

/** Shared JSX for root Open Graph / Twitter card images. */
export function BrandOgImageContent({ logoSrc, width, height }: BrandOgImageContentProps) {
  const compact = height <= 600;
  const logoSize = compact ? 176 : 232;
  const titleSize = compact ? 68 : 76;
  const taglineSize = compact ? 30 : 34;
  const padX = compact ? 78 : 88;
  const padY = compact ? 68 : 82;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: `${padY}px ${padX}px`,
        backgroundColor: "#000",
        color: "#fff",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 28,
          flex: 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: width - logoSize - padX * 2 - 40 }}>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: -1.5,
              lineHeight: 1.05,
            }}
          >
            {APP_DISPLAY_NAME}
          </div>
          <div
            style={{
              marginTop: compact ? 16 : 20,
              fontSize: taglineSize,
              fontWeight: 600,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.25,
            }}
          >
            {SITE_SEO_OG_TAGLINE}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          width={logoSize}
          height={logoSize}
          style={{
            width: logoSize,
            height: logoSize,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
      </div>
      <div
        style={{
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
            fontSize: compact ? 22 : 24,
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
