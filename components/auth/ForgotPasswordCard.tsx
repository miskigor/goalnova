"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hrefWithLocale } from "@/i18n/routing";
import { devError } from "@/lib/devLog";
import { getPublicAppOriginForClient } from "@/lib/site/publicAppUrl";
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

export function ForgotPasswordCard() {
  const t = useTranslations("authForgotPassword");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().includes("@") && !loading,
    [email, loading],
  );

  async function onSubmit() {
    setLoading(true);
    try {
      const origin = getPublicAppOriginForClient();
      const path = hrefWithLocale("/reset-password", locale);
      const redirectTo = origin ? `${origin.replace(/\/$/, "")}${path}` : path;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) {
        devError("[forgot-password] resetPasswordForEmail", error);
      }
      setDone(true);
    } catch (e) {
      devError("[forgot-password] unexpected", e);
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <Logo href="/" variant="entry" className="justify-center" showWordmark={false} />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-gn-text sm:mt-6">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gn-text-secondary">{t("subtitle")}</p>
      </div>

      {done ? (
        <div
          role="status"
          className="rounded-xl border border-gn-border-subtle bg-gn-bg/40 px-4 py-3 text-sm leading-relaxed text-gn-text-secondary"
        >
          {t("neutralSuccess")}
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
            <label htmlFor="fp-email" className="text-sm font-medium text-gn-text">
              {t("email")}
            </label>
            <input
              suppressHydrationWarning
              id="fp-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-surface px-3.5 py-3 text-sm text-gn-text placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25"
            />
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gn-accent py-3 text-sm font-semibold text-black transition-colors hover:bg-gn-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Spinner /> : null}
            {loading ? t("sending") : t("submit")}
          </button>
        </form>
      )}

      <p className="mt-6 border-t border-white/[0.06] pt-6 text-center text-sm text-gn-text-secondary">
        {t("supportHint")}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/support/account-recovery"
          aria-label={t("supportDestAria")}
          className="inline-flex justify-center rounded-xl border border-gn-border bg-gn-bg/30 px-4 py-2.5 text-center text-sm font-medium text-gn-text transition hover:border-gn-accent/40 hover:bg-gn-surface/60"
        >
          {t("contactSupport")}
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-gn-text-secondary">
        <Link href="/login" className="font-medium text-gn-accent hover:text-gn-accent-hover">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
