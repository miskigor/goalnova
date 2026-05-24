import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { LandingFeedPreview } from "@/components/landing/LandingFeedPreview";

type Props = {
  signupHref: string;
  challengesHref: string;
  headline: string;
  subhead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  previewBadge: string;
  previewCaption: string;
};

export function LandingHero({
  signupHref,
  challengesHref,
  headline,
  subhead,
  ctaPrimary,
  ctaSecondary,
  previewBadge,
  previewCaption,
}: Props) {
  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(249,115,22,0.22),transparent_55%)]"
        aria-hidden
      />
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_minmax(0,340px)] lg:items-center lg:gap-12">
        <div className="text-center lg:text-left">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-gn-text sm:text-4xl sm:leading-tight lg:text-5xl">
            {headline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-gn-text-secondary sm:text-lg lg:mx-0">
            {subhead}
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href={signupHref}
              className={`${GN_PRIMARY_BUTTON_CLASS} relative z-10 min-h-12 w-full rounded-full px-8 text-base sm:w-auto`}
            >
              {ctaPrimary}
            </a>
            <a
              href={challengesHref}
              className={`${GN_SECONDARY_BUTTON_CLASS} min-h-12 w-full rounded-full px-8 text-base sm:w-auto`}
            >
              {ctaSecondary}
            </a>
          </div>
        </div>
        <LandingFeedPreview badge={previewBadge} caption={previewCaption} />
      </div>
    </section>
  );
}
