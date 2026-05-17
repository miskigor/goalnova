import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

type Props = {
  signupHref: string;
  title: string;
  body: string;
  bullets: [string, string, string];
  cta: string;
};

export function LandingFoundingPlayer({ signupHref, title, body, bullets, cta }: Props) {
  return (
    <section
      className="border-t border-white/[0.06] px-4 py-12 sm:px-6 sm:py-16"
      aria-labelledby="landing-founding-heading"
    >
      <div className="mx-auto max-w-6xl rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-500/15 via-white/[0.04] to-transparent p-5 shadow-[0_0_40px_-12px_rgba(249,115,22,0.35)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 flex-1">
            <h2
              id="landing-founding-heading"
              className="text-xl font-bold tracking-tight text-gn-text sm:text-2xl"
            >
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gn-text-secondary sm:text-base">
              {body}
            </p>
            <ul className="mt-5 space-y-2.5">
              {bullets.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-gn-text sm:text-[0.9375rem]">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400"
                    aria-hidden
                  >
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
                      <path d="M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2.5-2.5a1 1 0 1 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z" />
                    </svg>
                  </span>
                  <span className="min-w-0 leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <a
            href={signupHref}
            className={`${GN_PRIMARY_BUTTON_CLASS} min-h-12 w-full shrink-0 rounded-full px-6 text-center text-base sm:min-w-[14rem] lg:w-auto`}
          >
            {cta}
          </a>
        </div>
      </div>
    </section>
  );
}
