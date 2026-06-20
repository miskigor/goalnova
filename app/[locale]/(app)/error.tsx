"use client";

import { useEffect, useState } from "react";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { browserLocalePrefixFromPathname } from "@/lib/i18n/browserLocalePrefix";

/**
 * Catches runtime errors in authenticated app routes.
 * Intentionally avoids `next-intl` hooks so a broken i18n tree cannot crash this screen too.
 */
export default function AppSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [prefix, setPrefix] = useState("");

  useEffect(() => {
    setPrefix(browserLocalePrefixFromPathname(window.location.pathname));
  }, []);

  useEffect(() => {
    console.error("[PitchRusch app error]", error);
  }, [error]);

  const homeHref = prefix ? `${prefix}/home` : "/home";
  const loginHref = prefix ? `${prefix}/login` : "/login";

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-lg font-semibold text-gn-text">
        Nešto je pošlo po krivu. Pokušaj ponovno.
      </p>
      <p className="text-sm text-gn-text-secondary">
        Something went wrong. Please try again.
      </p>
      {error.message ? (
        <details className="max-w-lg text-start text-xs text-gn-text-tertiary">
          <summary className="cursor-pointer text-gn-text-secondary">Tehnički detalj</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-gn-border-subtle bg-gn-surface/50 p-3 font-mono text-[11px] text-gn-text-secondary">
            {error.message}
          </pre>
        </details>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={() => reset()} className={GN_PRIMARY_BUTTON_CLASS}>
          Pokušaj ponovno
        </button>
        <a href={homeHref} className={GN_SECONDARY_BUTTON_CLASS}>
          Početna
        </a>
        <a href={loginHref} className={GN_SECONDARY_BUTTON_CLASS}>
          Prijava
        </a>
      </div>
    </div>
  );
}
