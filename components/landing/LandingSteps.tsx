type Step = { title: string; description: string };

type Props = {
  steps: [Step, Step, Step];
};

export function LandingSteps({ steps }: Props) {
  return (
    <section className="box-border w-full min-w-0 max-w-full overflow-x-clip border-t border-white/[0.06] px-4 py-12 sm:px-6 sm:py-16">
      <ol className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 sm:grid-cols-3 sm:gap-5">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gn-accent/15 text-sm font-bold text-gn-accent"
              aria-hidden
            >
              {index + 1}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-gn-text">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gn-text-secondary">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
