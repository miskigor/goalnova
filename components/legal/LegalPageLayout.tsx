import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type Props = {
  title: string;
  lastUpdated?: string;
  backLabel: string;
  children: ReactNode;
};

export function LegalPageLayout({
  title,
  lastUpdated,
  backLabel,
  children,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-5 sm:py-10 lg:max-w-3xl lg:py-12">
      <Link
        href="/"
        className="text-sm font-medium text-gn-accent transition-colors hover:text-gn-accent-hover hover:underline"
      >
        {backLabel}
      </Link>

      <header className="mt-8 border-b border-gn-border-subtle pb-8">
        <h1 className="text-xl font-semibold tracking-tight text-gn-text sm:text-2xl lg:text-3xl">
          {title}
        </h1>
        {lastUpdated ? (
          <p className="mt-3 text-sm text-gn-text-tertiary">{lastUpdated}</p>
        ) : null}
      </header>

      <div className="mt-8 space-y-10 text-sm leading-relaxed text-gn-text-secondary sm:text-[0.9375rem] sm:leading-[1.65]">
        {children}
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-8">
      <h2 className="text-base font-semibold tracking-tight text-gn-text sm:text-lg">
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function LegalBulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-inside list-disc space-y-2 marker:text-gn-accent/80">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
