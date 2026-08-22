type FaqItem = { question: string; answer: string };

type Props = {
  aboutTitle: string;
  aboutLead: string;
  aboutBody: string;
  faqHeading: string;
  faqs: FaqItem[];
};

/** Indexable about + FAQ under the fold — Google needs this text, the hero photo is not enough. */
export function LandingSeoContent({
  aboutTitle,
  aboutLead,
  aboutBody,
  faqHeading,
  faqs,
}: Props) {
  return (
    <section className="border-t border-white/[0.06] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold tracking-tight text-gn-text sm:text-2xl">{aboutTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gn-text-secondary sm:text-base">
          {aboutLead}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gn-text-secondary sm:text-base">
          {aboutBody}
        </p>

        <h2 className="mt-12 text-xl font-bold tracking-tight text-gn-text sm:text-2xl">
          {faqHeading}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {faqs.map((item) => (
            <article
              key={item.question}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6"
            >
              <h3 className="text-base font-semibold text-gn-text">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gn-text-secondary">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
