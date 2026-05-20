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
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <a
          href={homeHref}
          className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/45 sm:gap-2.5"
        >
          <Logo href={null} variant="inline" showWordmark={false} priority />
          <span className="truncate text-sm font-extrabold tracking-tight text-gn-text sm:text-lg">
            PitchRusch
          </span>
        </a>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher variant="landing" />
          <a
            href={loginHref}
            className="rounded-lg px-2 py-2 text-xs font-medium text-gn-text-secondary transition hover:text-gn-text sm:px-3 sm:text-sm"
          >
            {loginLabel}
          </a>
          <a
            href={signupHref}
            className={`${GN_PRIMARY_BUTTON_CLASS} relative z-10 !rounded-full !px-3 !py-1.5 !text-xs sm:!px-4 sm:!py-2 sm:!text-sm`}
          >
            {joinLabel}
          </a>
        </div>
      </div>
    </header>
  );
}
