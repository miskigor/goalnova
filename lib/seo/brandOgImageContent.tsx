import { SITE_SEO_OG_TAGLINE } from "@/lib/seo/brandMetadata";

type BrandOgImageContentProps = {
  logoSrc: string;
  width: number;
  height: number;
};

/** Shared JSX for root Open Graph / Twitter card images — centered full brand mark. */
export function BrandOgImageContent({ logoSrc, width, height }: BrandOgImageContentProps) {
  const compact = height <= 600;
  const logoWidth = compact ? 420 : 500;
  const logoHeight = compact ? 420 : 500;
  const taglineSize = compact ? 28 : 32;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 24 : 28,
        padding: compact ? "48px 64px" : "56px 72px",
        backgroundColor: "#000",
        color: "#fff",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt=""
        width={logoWidth}
        height={logoHeight}
        style={{
          width: logoWidth,
          height: logoHeight,
          objectFit: "contain",
        }}
      />
      <div
        style={{
          fontSize: taglineSize,
          fontWeight: 600,
          color: "rgba(255,255,255,0.82)",
          lineHeight: 1.25,
          textAlign: "center",
          maxWidth: width - 120,
        }}
      >
        {SITE_SEO_OG_TAGLINE}
      </div>
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
  );
}
