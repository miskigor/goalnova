import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  APP_DISPLAY_NAME,
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_SRC,
  BRAND_LOGO_WIDTH,
} from "@/lib/constants/brand";

type LogoVariant = "header" | "landing" | "inline" | "entry";

type LogoProps = {
  /**
   * Target path for the internal `Link`. Default `"/"`.
   * Pass `null` when a native `<a>` wraps the logo (avoids nested interactive elements).
   */
  href?: string | null;
  variant?: LogoVariant;
  className?: string;
  priority?: boolean;
  /** When false, only the mark is shown (no “PitchRusch” wordmark). */
  showWordmark?: boolean;
};

/** Square wordmark (`logo.png` 1:1): fixed box + `object-contain` keeps proportions. */
const variantClass: Record<LogoVariant, string> = {
  header: "size-10 shrink-0 sm:size-11",
  /**
   * Hero / first visit — ~4× prior hero size, capped by viewport so it stays on screen.
   * (Previously ~11rem max; now up to 44rem with vw/dvh clamps.)
   */
  landing:
    "size-[min(92vw,44rem,65dvh)] shrink-0 sm:size-[min(80vw,48rem,70dvh)] md:size-[min(72vw,52rem,78dvh)]",
  inline: "size-10 shrink-0 sm:size-11",
  /** Login / signup — strong mark; tight `dvh` cap keeps the form visible on small phones. */
  entry: "size-[min(100%,15rem,26dvh)] shrink-0 sm:size-[min(100%,18rem,34dvh)]",
};

/**
 * Two `drop-shadow` layers in both states so `filter` can interpolate smoothly.
 * Tight white rim + soft orange bloom — reads clearly on near-black without stretching the bitmap.
 */
const logoImageFilterClass =
  "transition-[filter] duration-300 ease-out motion-reduce:transition-none " +
  "drop-shadow-[0_0_1px_rgba(255,255,255,0.14),0_0_14px_rgba(249,115,22,0.14)] " +
  "group-hover:drop-shadow-[0_0_1px_rgba(255,255,255,0.22),0_0_32px_rgba(249,115,22,0.55)]";

const wordmarkTextClass: Record<LogoVariant, string> = {
  header: "text-base font-extrabold tracking-tight sm:text-lg",
  landing: "text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl",
  inline: "text-base font-extrabold tracking-tight sm:text-lg",
  entry: "text-base font-extrabold tracking-tight sm:text-lg",
};

/** “Pitch” bijelo + “Rusch” narandžasto, spojeno (bez razmaka između slova). */
function LogoWordmark({ variant }: { variant: LogoVariant }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap leading-none ${wordmarkTextClass[variant]}`}
      aria-hidden
    >
      <span className="text-white">Pitch</span>
      <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Rusch</span>
    </span>
  );
}

export function Logo({
  href,
  variant = "header",
  className = "",
  priority = false,
  showWordmark = true,
}: LogoProps) {
  const resolvedHref = href === undefined ? "/" : href;
  const imgClass =
    `block object-contain object-left ${variantClass[variant]} ${logoImageFilterClass}`.trim();

  const image = (
    <Image
      src={BRAND_LOGO_SRC}
      alt=""
      width={BRAND_LOGO_WIDTH}
      height={BRAND_LOGO_HEIGHT}
      quality={BRAND_LOGO_SRC.endsWith(".svg") ? undefined : 92}
      unoptimized={BRAND_LOGO_SRC.endsWith(".svg")}
      priority={priority || variant === "landing" || variant === "entry"}
      className={imgClass}
    />
  );

  const mark = (
    <>
      {image}
      {showWordmark ? <LogoWordmark variant={variant} /> : null}
    </>
  );

  const gapClass = showWordmark ? "gap-2 sm:gap-2.5" : "gap-0";

  if (resolvedHref) {
    return (
      <Link
        href={resolvedHref}
        aria-label={APP_DISPLAY_NAME}
        className={`group inline-flex shrink-0 items-center ${gapClass} rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg ${className}`.trim()}
        dir="ltr"
      >
        {mark}
      </Link>
    );
  }

  return (
    <span
      role="img"
      aria-label={APP_DISPLAY_NAME}
      className={`group inline-flex shrink-0 items-center justify-center ${gapClass} ${className}`.trim()}
      dir="ltr"
    >
      {mark}
    </span>
  );
}
