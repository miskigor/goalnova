import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

type Props = {
  signupHref: string;
  title: string;
  text: string;
  cta: string;
};

export function LandingFoundingPlayer({ signupHref, title, text, cta }: Props) {
  return (
    <section className="px-4 pb-12 sm:px-6 sm:pb-16">
      <div className="mx-auto max-w-6xl rounded-2xl border border-gn-accent/35 bg-gradient-to-br from-gn-accent/10 via-white/[0.03] to-transparent p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
        <div className="min-w-0 sm:flex-1">
          <h2 className="text-xl font-bold text-gn-text sm:text-2xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gn-text-secondary sm:text-base">
            {text}
          </p>
        </div>
        <a
          href={signupHref}
          className={`${GN_PRIMARY_BUTTON_CLASS} mt-5 min-h-12 w-full shrink-0 rounded-full px-8 text-base sm:mt-0 sm:w-auto`}
        >
          {cta}
        </a>
      </div>
    </section>
  );
}
