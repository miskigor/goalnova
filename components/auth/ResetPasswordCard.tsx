"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { devError } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/Logo";

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

export function ResetPasswordCard() {
  const t = useTranslations("authResetPassword");

  const settledRef = useRef(false);
  const [checking, setChecking] = useState(true);
  const [recoverOk, setRecoverOk] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const settle = (ok: boolean) => {
      if (cancelled || settledRef.current) return;
      settledRef.current = true;
      setRecoverOk(ok);
      setChecking(false);
    };

    async function consumeAuthRedirect() {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) devError("[reset-password] exchangeCodeForSession", error);
        url.searchParams.delete("code");
        const qs = url.searchParams.toString();
        window.history.replaceState(
          null,
          "",
          `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`,
        );
      }

      const rawHash = window.location.hash?.replace(/^#/, "") ?? "";
      if (rawHash) {
        const p = new URLSearchParams(rawHash);
        const at = p.get("access_token");
        const rt = p.get("refresh_token");
        if (at && rt) {
          const { error } = await supabase.auth.setSession({
            access_token: at,
            refresh_token: rt,
          });
          if (error) devError("[reset-password] setSession from hash", error);
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
        }
      }
    }

    const clearTimers: number[] = [];
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      await consumeAuthRedirect();
      if (cancelled) return;

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY" && session) settle(true);
      });
      unsubscribe = () => sub.subscription.unsubscribe();

      void supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        if (data.session) settle(true);
      });

      clearTimers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          void supabase.auth.getSession().then(({ data }) => {
            if (cancelled) return;
            if (data.session) settle(true);
          });
        }, 400),
      );

      clearTimers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          void supabase.auth.getSession().then(({ data }) => {
            if (cancelled) return;
            settle(Boolean(data.session));
          });
        }, 7000),
      );
    })();

    return () => {
      cancelled = true;
      for (const id of clearTimers) window.clearTimeout(id);
      unsubscribe?.();
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      !checking &&
      recoverOk &&
      !success &&
      password.length >= 6 &&
      confirm.length >= 6 &&
      !loading
    );
  }, [checking, recoverOk, success, password, confirm, loading]);

  async function onSubmit() {
    setError(null);
    if (password.length < 6) {
      setError(t("tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }

    setLoading(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) {
        devError("[reset-password] updateUser", upErr);
        setError(t("invalidSession"));
      } else {
        setSuccess(true);
        void supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
    } catch (e) {
      devError("[reset-password] unexpected", e);
      setError(t("invalidSession"));
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center gap-3 py-16 text-sm text-gn-text-secondary">
        <Spinner />
        {t("checkingSession")}
      </div>
    );
  }

  if (!recoverOk && !success) {
    return (
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 text-center sm:p-8">
        <Logo href="/" variant="inline" className="justify-center" showWordmark={false} />
        <p className="mt-6 text-sm leading-relaxed text-gn-text-secondary">{t("invalidSession")}</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/forgot-password"
            className="inline-block font-medium text-gn-accent hover:text-gn-accent-hover"
          >
            {t("requestNewLink")}
          </Link>
          <Link
            href="/support/account-recovery"
            className="text-xs font-medium text-gn-text-secondary underline decoration-white/15 underline-offset-4 hover:text-gn-text hover:decoration-gn-accent/50"
          >
            {t("supportRecoveryLink")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-8">
      <div className="mb-6 text-center">
        <Logo href="/" variant="entry" className="justify-center" showWordmark={false} />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-gn-text">{t("title")}</h1>
        <p className="mt-2 text-sm text-gn-text-secondary">{t("subtitleRecovery")}</p>
      </div>

      {success ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-100/90"
        >
          <p>{t("success")}</p>
          <Link
            href="/login"
            className="mt-4 inline-flex font-medium text-gn-accent hover:text-gn-accent-hover"
          >
            {t("goToLogin")}
          </Link>
        </div>
      ) : (
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
            <label htmlFor="rp-pw" className="text-sm font-medium text-gn-text">
              {t("password")}
            </label>
            <input
              suppressHydrationWarning
              id="rp-pw"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text outline-none focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
            />
          </div>
          <div>
            <label htmlFor="rp-pw2" className="text-sm font-medium text-gn-text">
              {t("confirm")}
            </label>
            <input
              suppressHydrationWarning
              id="rp-pw2"
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder={t("passwordPlaceholder")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text outline-none focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
            />
          </div>
          {error ? (
            <div role="alert" className="rounded-xl border border-red-500/35 bg-red-950/20 px-3 py-2 text-sm text-red-100/90">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gn-accent py-3 text-sm font-semibold text-black transition-colors hover:bg-gn-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Spinner /> : null}
            {loading ? t("updating") : t("submit")}
          </button>
        </form>
      )}
    </div>
  );
}
