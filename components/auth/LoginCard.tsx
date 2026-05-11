"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { devError } from "@/lib/devLog";
import { signInWithEmailPassword, signOut } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/Logo";

function homeUrlForLocale(locale: string): string {
  const path = locale === routing.defaultLocale ? "/home" : `/${locale}/home`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

type FieldError = string | null;

export type LoginFormLabels = {
  title: string;
  subtitle: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  signingIn: string;
  submit: string;
  invalidCredentials: string;
  emailNotConfirmed: string;
  noAccount: string;
  signUpLink: string;
  forgotPasswordLink: string;
  invalidEmail: string;
  invalidPassword: string;
  genericError: string;
  configMissing: string;
  accountBanned: string;
  rateLimited: string;
  networkError: string;
  loginTimedOut: string;
  alreadySignedInTitle: string;
  alreadySignedInHint: string;
  continueToHome: string;
  signOutToSwitchAccount: string;
};

function extractAuth(err: unknown): { message: string; code: string; status?: number } {
  let message = "";
  let code = "";
  let status: number | undefined;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string" && e.message.trim().length > 0) {
      message = e.message.trim();
    } else if (typeof e.msg === "string" && e.msg.trim().length > 0) {
      message = e.msg.trim();
    }
    if (typeof e.code === "string") code = e.code;
    if (typeof e.status === "number") status = e.status;
    if (status === undefined && typeof e.statusCode === "number") status = e.statusCode;
  }
  if (!message && typeof err === "string") message = err;
  if (!message && err !== null && err !== undefined) {
    try {
      const s = JSON.stringify(err);
      if (s && s !== "{}") message = s;
    } catch {
      message = String(err);
    }
  }
  if (!message) message = String(err ?? "");
  return { message, code, status };
}

function safeSerializeError(err: unknown): string {
  if (err instanceof Error) {
    const stack = err.stack?.split("\n").slice(0, 4).join(" · ");
    const base = err.message?.trim() || err.name;
    return stack && stack.length > base.length ? stack.slice(0, 420) : base.slice(0, 420);
  }
  try {
    const s = JSON.stringify(err);
    return s === "{}" ? "Unknown error (empty server response)." : s.slice(0, 420);
  } catch {
    return String(err).slice(0, 420);
  }
}

function classifyLoginError(err: unknown): {
  kind:
    | "invalid_credentials"
    | "email_not_confirmed"
    | "user_banned"
    | "rate_limited"
    | "config"
    | "timeout"
    | "network"
    | "unknown";
  raw: string;
  code: string;
} {
  const { message, code, status } = extractAuth(err);
  const lower = message.toLowerCase();
  const c = code.toLowerCase();

  if (/missing env var|supabase is not configured|next_public_supabase/i.test(message)) {
    return { kind: "config", raw: message, code };
  }
  if (
    c === "email_not_confirmed" ||
    lower.includes("email not confirmed") ||
    lower.includes("email address not confirmed")
  ) {
    return { kind: "email_not_confirmed", raw: message, code };
  }
  if (
    c === "user_banned" ||
    lower.includes("user_banned") ||
    lower.includes("banned") && lower.includes("user")
  ) {
    return { kind: "user_banned", raw: message, code };
  }
  if (
    c === "over_request_rate_limit" ||
    c === "too_many_requests" ||
    /rate limit|too many requests/i.test(lower)
  ) {
    return { kind: "rate_limited", raw: message, code };
  }
  if (
    c === "invalid_credentials" ||
    /invalid login credentials|invalid email or password|wrong password|incorrect password/i.test(
      message,
    )
  ) {
    return { kind: "invalid_credentials", raw: message, code };
  }
  if (/login request timed out|sign in request timed out/i.test(lower)) {
    return { kind: "timeout", raw: message, code };
  }
  if (
    status === 503 ||
    /failed to fetch|typeerror: failed to fetch|network error|load failed|aborted|service unavailable|err_network|net::err_|connection (refused|reset)|econnrefused|enotfound/i.test(
      lower,
    )
  ) {
    return { kind: "network", raw: message, code };
  }
  if (/timed out|timeout/i.test(lower)) {
    return { kind: "network", raw: message, code };
  }
  return { kind: "unknown", raw: message, code };
}

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

function sanitizeDetail(raw: string, code: string): string {
  const line = [code ? `code=${code}` : null, raw.trim() || null].filter(Boolean).join(" · ");
  return line.length > 400 ? `${line.slice(0, 400)}…` : line;
}

function detailForLoginFailure(
  err: unknown,
  kind: ReturnType<typeof classifyLoginError>["kind"],
  raw: string,
  code: string,
): string | null {
  if (kind === "invalid_credentials") return null;
  const primary = sanitizeDetail(raw, code);
  if (primary) return primary;
  if (kind === "unknown" || kind === "network" || kind === "timeout") {
    return safeSerializeError(err);
  }
  return null;
}

type Props = { labels: LoginFormLabels };

export function LoginCard({ labels }: Props) {
  const locale = useLocale();

  /** `null` until first auth snapshot (show email/password form immediately like before — no blocking spinner). */
  const [sessionUser, setSessionUser] = useState<User | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function applySession(next: User | null) {
      if (!cancelled) setSessionUser(next);
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        applySession(data.session?.user ?? null);
      })
      .catch((err) => {
        devError("LoginCard: getSession failed", err);
        applySession(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOutForSwitch() {
    setError(null);
    setErrorDetail(null);
    setLoading(true);
    try {
      await signOut();
      setSessionUser(null);
    } catch (err) {
      devError("LoginCard signOut:", err);
      setError(labels.genericError);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading && !redirecting;
  }, [email, password, loading, redirecting]);

  if (sessionUser) {
    const emailLabel = sessionUser.email?.trim() || "—";
    return (
      <div className="mx-auto w-full rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <Logo href="/" variant="entry" className="justify-center" showWordmark={false} />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-gn-text sm:mt-6">
            {labels.alreadySignedInTitle}
          </h1>
          <p className="mt-2 break-all text-sm font-medium text-gn-accent">{emailLabel}</p>
          <p className="mt-3 text-sm text-gn-text-secondary">{labels.alreadySignedInHint}</p>
        </div>
        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-500/35 bg-red-950/20 px-3.5 py-2 text-sm text-red-100/90"
          >
            {error}
          </div>
        ) : null}
        <div className="flex flex-col gap-3">
          <Link
            href="/home"
            className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-gn-accent py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-gn-accent-hover"
          >
            {labels.continueToHome}
          </Link>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleSignOutForSwitch()}
            className="w-full rounded-xl border border-gn-border bg-transparent py-3 text-sm font-semibold text-gn-text transition-colors hover:bg-gn-surface disabled:opacity-60"
          >
            {loading ? labels.signingIn : labels.signOutToSwitchAccount}
          </button>
        </div>
      </div>
    );
  }

  async function onSubmit() {
    setError(null);
    setErrorDetail(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@")) {
      setError(labels.invalidEmail);
      return;
    }
    if (password.length < 6) {
      setError(labels.invalidPassword);
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
      window.setTimeout(() => {
        window.location.assign(homeUrlForLocale(locale));
      }, 450);
      window.setTimeout(() => {
        setRedirecting(false);
        setLoading(false);
      }, 8000);
    } catch (err) {
      const { kind, raw, code } = classifyLoginError(err);
      if (kind !== "invalid_credentials") {
        devError("Login error:", err);
      }

      let msg = labels.genericError;
      if (kind === "invalid_credentials") msg = labels.invalidCredentials;
      else if (kind === "email_not_confirmed") msg = labels.emailNotConfirmed;
      else if (kind === "user_banned") msg = labels.accountBanned;
      else if (kind === "rate_limited") msg = labels.rateLimited;
      else if (kind === "config") msg = labels.configMissing;
      else if (kind === "timeout") msg = labels.loginTimedOut;
      else if (kind === "network") msg = labels.networkError;

      setError(msg);
      setErrorDetail(detailForLoginFailure(err, kind, raw, code));
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
          {labels.title}
        </h1>
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
          <label htmlFor="login-email" className="text-sm font-medium text-gn-text">
            {labels.email}
          </label>
          <input
            suppressHydrationWarning
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={labels.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="text-sm font-medium text-gn-text">
            {labels.password}
          </label>
          <input
            suppressHydrationWarning
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder={labels.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
          />
          <div className="mt-2 text-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-gn-accent hover:text-gn-accent-hover"
            >
              {labels.forgotPasswordLink}
            </Link>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="space-y-2 rounded-xl border border-red-500/35 bg-red-950/20 px-3.5 py-2 text-sm text-red-100/90"
          >
            <p>{error}</p>
            {errorDetail ? (
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-red-100/75">
                {errorDetail}
              </pre>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || redirecting}
          aria-busy={loading || redirecting}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gn-accent py-3 text-sm font-semibold text-black transition-colors hover:bg-gn-accent-hover active:bg-gn-accent-pressed disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-gn-accent"
        >
          {loading || redirecting ? <Spinner /> : null}
          {loading || redirecting ? labels.signingIn : labels.submit}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gn-text-secondary">
        {labels.noAccount}{" "}
        <Link
          href="/signup"
          className="font-medium text-gn-accent hover:text-gn-accent-hover"
        >
          {labels.signUpLink}
        </Link>
      </p>
    </div>
  );
}
