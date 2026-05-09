"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import {
  isSignupEmailAlreadyExistsError,
  signUpWithEmailPassword,
} from "@/lib/supabase/auth";
import { devError } from "@/lib/devLog";
import { GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

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

export function SignupCard() {
  const tSignup = useTranslations("authSignup");
  const tCommon = useTranslations("authCommon");
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Prevents duplicate submit after account creation (no success UI). */
  const [signupComplete, setSignupComplete] = useState(false);
  const [showLoginCta, setShowLoginCta] = useState(false);

  const canSubmit = useMemo(() => {
    const trimmed = email.trim();
    return (
      fullName.trim().length > 0 &&
      trimmed.includes("@") &&
      password.length >= 6 &&
      !loading &&
      !signupComplete
    );
  }, [fullName, email, password, loading, signupComplete]);

  async function onSubmit() {
    setError(null);
    setShowLoginCta(false);

    const trimmedEmail = email.trim();
    if (!fullName.trim()) {
      setError(tSignup("fullNameRequired"));
      return;
    }
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
      const signupResult = await signUpWithEmailPassword({
        email: trimmedEmail,
        password,
        fullName,
      });

      setSignupComplete(true);

      // Redirect immediately when signup also created a session.
      // Avoid an extra getSession() roundtrip that can race with AuthGate guest redirect.
      if (!signupResult.requiresEmailConfirmation) {
        router.replace("/role");
      }
    } catch (err) {
      devError("Signup error:", err);
      if (isSignupEmailAlreadyExistsError(err)) {
        setError(tSignup("emailAlreadyExists"));
        setShowLoginCta(true);
      } else if (
        err instanceof Error &&
        /too many signup attempts/i.test(err.message)
      ) {
        setError(tCommon("rateLimited"));
      } else {
        setError(tCommon("genericError"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <Logo href="/" variant="entry" className="justify-center" showWordmark={false} />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-gn-text sm:mt-6">
          {tSignup("title")}
        </h1>
        <p className="mt-2 text-sm text-gn-text-secondary">{tSignup("subtitle")}</p>
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
          <label htmlFor="signup-name" className="text-sm font-medium text-gn-text">
            {tSignup("fullName")}
          </label>
          <input
            suppressHydrationWarning
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder={tSignup("namePlaceholder")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="text-sm font-medium text-gn-text">
            {tSignup("email")}
          </label>
          <input
            suppressHydrationWarning
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={tSignup("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="text-sm font-medium text-gn-text">
            {tSignup("password")}
          </label>
          <input
            suppressHydrationWarning
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={tSignup("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
          />
        </div>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-red-500/35 bg-red-950/20 px-3.5 py-3 text-sm text-red-100/90"
          >
            <p>{error}</p>
            {showLoginCta ? (
              <Link
                href="/login"
                className={`${GN_SECONDARY_BUTTON_CLASS} mt-3 inline-flex w-full justify-center border-red-400/40 bg-red-950/30 text-red-50 hover:border-red-300/50 hover:bg-red-900/40`}
              >
                {tSignup("goToLogin")}
              </Link>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          aria-busy={loading}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gn-accent py-3 text-sm font-semibold text-black transition-colors hover:bg-gn-accent-hover active:bg-gn-accent-pressed disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-gn-accent"
        >
          {loading ? <Spinner /> : null}
          {loading ? tSignup("creatingAccount") : tSignup("submit")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gn-text-secondary">
        {tSignup("haveAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-gn-accent hover:text-gn-accent-hover"
        >
          {tSignup("loginLink")}
        </Link>
      </p>
    </div>
  );
}

