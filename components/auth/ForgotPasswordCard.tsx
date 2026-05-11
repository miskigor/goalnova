"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hrefWithLocale } from "@/i18n/routing";
import { devError } from "@/lib/devLog";
import { requestPasswordResetEmail } from "@/lib/supabase/auth";
import { Logo } from "@/components/brand/Logo";

export type ForgotPasswordFormLabels = {
  title: string;
  subtitle: string;
  email: string;
  emailPlaceholder: string;
  submit: string;
  sending: string;
  success: string;
  rateLimited: string;
  sendFailed: string;
  invalidEmail: string;
  backToLogin: string;
  needSupport: string;
  needSupportLink: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ForgotPasswordCard({ labels }: { labels: ForgotPasswordFormLabels }) {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !loading && !sent && email.trim().length > 0;
  }, [loading, sent, email]);

  async function onSubmit() {
    setError(null);
    if (!isValidEmail(email)) {
      setError(labels.invalidEmail);
      return;
    }

    setLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}${hrefWithLocale("/reset-password", locale)}`;
      const result = await requestPasswordResetEmail(email, redirectTo);
      if (result.status === "sent") {
        setSent(true);
      } else if (result.status === "rate_limited") {
        setError(labels.rateLimited);
      } else {
        setError(labels.sendFailed);
      }
    } catch (e) {
      devError("[forgot-password] unexpected", e);
      setError(labels.sendFailed);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-8">
        <Logo href="/" variant="entry" className="justify-center" showWordmark={false} />
        <p
          role="status"
          className="mt-6 text-sm leading-relaxed text-gn-text-secondary"
        >
          {labels.success}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex font-medium text-gn-accent hover:text-gn-accent-hover"
        >
          {labels.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-8">
      <div className="mb-6 text-center">
        <Logo href="/" variant="entry" className="justify-center" showWordmark={false} />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-gn-text">{labels.title}</h1>
        <p className="mt-2 text-sm text-gn-text-secondary">{labels.subtitle}</p>
      </div>

      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          void onSubmit();
        }}
      >
        <div>
          <label htmlFor="fp-email" className="text-sm font-medium text-gn-text">
            {labels.email}
          </label>
          <input
            suppressHydrationWarning
            id="fp-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={labels.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/35 bg-red-950/20 px-3 py-2 text-sm text-red-100/90"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gn-accent py-3 text-sm font-semibold text-black transition-colors hover:bg-gn-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? labels.sending : labels.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gn-text-secondary">
        {labels.needSupport}{" "}
        <Link
          href="/support/account-recovery"
          className="font-medium text-gn-accent hover:text-gn-accent-hover"
        >
          {labels.needSupportLink}
        </Link>
      </p>
    </div>
  );
}
