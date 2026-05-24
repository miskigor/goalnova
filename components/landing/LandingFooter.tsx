type Props = {
  footerText: string;
  termsHref: string;
  privacyHref: string;
  contentPolicyHref: string;
  contactHref: string;
  termsLabel: string;
  privacyLabel: string;
  contentPolicyLabel: string;
  contactLabel: string;
  navAriaLabel: string;
};

export function LandingFooter({
  footerText,
  termsHref,
  privacyHref,
  contentPolicyHref,
  contactHref,
  termsLabel,
  privacyLabel,
  contentPolicyLabel,
  contactLabel,
  navAriaLabel,
}: Props) {
  return (
    <footer className="box-border w-full min-w-0 max-w-full overflow-x-clip border-t border-white/[0.06] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center gap-4">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-gn-text-secondary sm:text-sm"
          aria-label={navAriaLabel}
        >
          <a href={termsHref} className="transition-colors hover:text-gn-text hover:underline">
            {termsLabel}
          </a>
          <a href={privacyHref} className="transition-colors hover:text-gn-text hover:underline">
            {privacyLabel}
          </a>
          <a
            href={contentPolicyHref}
            className="transition-colors hover:text-gn-text hover:underline"
          >
            {contentPolicyLabel}
          </a>
          <a href={contactHref} className="transition-colors hover:text-gn-text hover:underline">
            {contactLabel}
          </a>
        </nav>
        <p className="text-center text-xs text-gn-text-tertiary">{footerText}</p>
      </div>
    </footer>
  );
}
