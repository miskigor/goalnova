"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { devError } from "@/lib/devLog";
import { signInWithEmailPassword } from "@/lib/supabase/auth";
import { Logo } from "@/components/brand/Logo";

function homeUrlForLocale(locale: string): string {
  const path = locale === routing.defaultLocale ? "/home" : `/${locale}/home`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

type FieldError = string | null;

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-black"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}

export function LoginCard() {
  const tLogin = useTranslations("authLogin");
  const tCommon = useTranslations("authCommon");
  const tLanding = useTranslations("landing");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const [redirecting, setRedirecting] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading && !redirecting;
  }, [email, password, loading, redirecting]);

  // Redirecting if a session exists is handled by the route-level `AuthGate`.

  async function onSubmit() {
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@")) {
      setError(tCommon("invalidEmail"));
      return;
    }
    if (password.length < 6) {
      setError(tCommon("invalidPassword"));
      return;
    }

    setLoading(true);
    try {
      await Promise.race([
        signInWithEmailPassword({ email: trimmedEmail, password }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error("Login request timed out"));
          }, 20000);
        }),
      ]);
      setRedirecting(true);
      // Full navigation avoids mobile Safari / client router stalls after auth.
      window.setTimeout(() => {
        window.location.assign(homeUrlForLocale(locale));
      }, 300);
      // Failsafe: if navigation doesn't happen, unlock the form again.
      window.setTimeout(() => {
        setRedirecting(false);
        setLoading(false);
      }, 6000);
    } catch (err) {
      const raw =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "";
      const isInvalidCredentials =
        /invalid login credentials|invalid email or password/i.test(raw);
      if (!isInvalidCredentials) {
        devError("Login error:", err);
      }
      if (isInvalidCredentials) {
        setError(tLogin("invalidCredentials"));
      } else if (/timed out|failed to fetch|network/i.test(raw)) {
        setError(tCommon("genericError"));
      } else {
        setError(tCommon("genericError"));
      }
      setRedirecting(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <Logo href="/" variant="entry" className="justify-center" showWordmark={false} />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-gn-text sm:mt-6">
          {tLogin("title")}
        </h1>
        <p className="mt-2 text-sm text-gn-text-secondary">{tLogin("subtitle")}</p>
      </div>

      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          onSubmit();
        }}
      >
        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-gn-text">
            {tLogin("email")}
          </label>
          <input
            suppressHydrationWarning
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={tLogin("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="text-sm font-medium text-gn-text">
            {tLogin("password")}
          </label>
          <input
            suppressHydrationWarning
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder={tLogin("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
          />
          <div className="mt-2 text-end">
            <Link
              href="/support/account-recovery"
              className="text-xs font-medium text-gn-accent hover:text-gn-accent-hover"
            >
              {tLanding("forgotPasswordLink")}
            </Link>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-red-500/35 bg-red-950/20 px-3.5 py-2 text-sm text-red-100/90"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || redirecting}
          aria-busy={loading}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gn-accent py-3 text-sm font-semibold text-black transition-colors hover:bg-gn-accent-hover active:bg-gn-accent-pressed disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-gn-accent"
        >
          {loading ? <Spinner /> : null}
          {loading ? tLogin("signingIn") : tLogin("submit")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gn-text-secondary">
        {tLogin("noAccount")}{" "}
        <Link
          href="/signup"
          className="font-medium text-gn-accent hover:text-gn-accent-hover"
        >
          {tLogin("signUpLink")}
        </Link>
      </p>
    </div>
  );
}

