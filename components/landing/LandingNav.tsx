import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

type Props = {
  homeHref: string;
  loginHref: string;
  signupHref: string;
  loginLabel: string;
  joinLabel: string;
};

export function LandingNav({ homeHref, loginHref, signupHref, loginLabel, joinLabel }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a
          href={homeHref}
          className="inline-flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/45"
        >
          <Logo href={null} variant="inline" showWordmark={false} priority />
          <span className="truncate text-base font-extrabold tracking-tight text-gn-text sm:text-lg">
            PitchRusch
          </span>
        </a>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden min-[400px]:block">
            <LanguageSwitcher variant="landing" />
          </div>
          <a
            href={loginHref}
            className="rounded-lg px-2.5 py-2 text-sm font-medium text-gn-text-secondary transition hover:text-gn-text sm:px-3"
          >
            {loginLabel}
          </a>
          <a href={signupHref} className={`${GN_PRIMARY_BUTTON_CLASS} !rounded-full !px-4 !py-2 text-sm`}>
            {joinLabel}
          </a>
        </div>
      </div>
    </header>
  );
}
