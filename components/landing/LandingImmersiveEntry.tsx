import Image from "next/image";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import "@/components/landing/landingImmersive.css";

type Props = {
  signupHref: string;
  loginHref: string;
  headline: string;
  subhead: string;
  ctaNewHere: string;
  ctaHaveAccount: string;
  changeLanguageLabel: string;
  heroImageAlt: string;
};

/**
 * Full-bleed entry viewport — brand, one headline, one line, two CTAs, language.
 * Atmosphere via stadium/skill photo + warm orange dusk (not purple).
 */
export function LandingImmersiveEntry({
  signupHref,
  loginHref,
  headline,
  subhead,
  ctaNewHere,
  ctaHaveAccount,
  changeLanguageLabel,
  heroImageAlt,
}: Props) {
  return (
    <section
      data-landing-immersive
      aria-label={APP_DISPLAY_NAME}
      className="relative isolate flex min-h-[100dvh] min-h-[100svh] flex-col overflow-hidden"
    >
      <div data-landing-immersive-media aria-hidden>
        <Image
          src="/images/landing/football-kick-preview.jpg"
          alt={heroImageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div data-landing-immersive-scrim />
      </div>

      <div data-landing-immersive-content>
        <div data-landing-immersive-brand>
          <Logo href={null} variant="inline" showWordmark={false} priority />
          <p data-landing-immersive-wordmark>{APP_DISPLAY_NAME}</p>
        </div>

        <div data-landing-immersive-copy>
          <h1 data-landing-immersive-headline>{headline}</h1>
          <p data-landing-immersive-subhead>{subhead}</p>
        </div>

        <div data-landing-immersive-actions>
          <a href={signupHref} data-landing-immersive-cta-primary>
            {ctaNewHere}
          </a>
          <a href={loginHref} data-landing-immersive-cta-secondary>
            {ctaHaveAccount}
          </a>
          <div data-landing-immersive-lang>
            <span className="sr-only">{changeLanguageLabel}</span>
            <LanguageSwitcher variant="landing" />
          </div>
        </div>
      </div>
    </section>
  );
}
