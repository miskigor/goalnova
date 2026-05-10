"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { devError } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import { submitAccountRecoveryRequest } from "@/lib/supabase/accountRecovery";

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-black"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}

export function AccountRecoveryForm() {
  const t = useTranslations("accountRecoverySupport");

  const [accountEmail, setAccountEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      accountEmail.trim().includes("@") &&
      contactEmail.trim().includes("@") &&
      message.trim().length >= 10 &&
      !loading &&
      !done
    );
  }, [accountEmail, contactEmail, message, loading, done]);

  async function onSubmit() {
    setError(null);
    const a = accountEmail.trim();
    const c = contactEmail.trim();
    if (!a.includes("@")) {
      setError(t("validationEmail"));
      return;
    }
    if (!c.includes("@")) {
      setError(t("validationEmail"));
      return;
    }
    if (message.trim().length < 10) {
      setError(t("validationMessageShort"));
      return;
    }

    setLoading(true);
    try {
      const { error: submitErr } = await submitAccountRecoveryRequest(supabase, {
        accountEmail: a,
        contactEmail: c,
        username: username.trim(),
        message: message.trim(),
      });
      if (submitErr) {
        devError("[account recovery]", submitErr);
        setError(t("submitFailed"));
        return;
      }
      setDone(true);
    } catch (e) {
      devError("[account recovery] unexpected", e);
      setError(t("submitFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-gn-border-subtle bg-gn-surface/70 p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-gn-text">{t("title")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-gn-text-secondary">{t("intro")}</p>

      {done ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/90"
        >
          {t("confirmMessage")}
          <Link href="/login" className="mt-3 inline-block font-medium text-gn-accent hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      ) : (
        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            void onSubmit();
          }}
        >
          <div>
            <label htmlFor="ar-account-email" className="text-sm font-medium text-gn-text">
              {t("accountEmailLabel")}
            </label>
            <input
              id="ar-account-email"
              type="email"
              autoComplete="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-bg px-3 py-2.5 text-sm text-gn-text outline-none focus:border-gn-accent/50 focus:ring-2 focus:ring-gn-accent/20"
            />
          </div>
          <div>
            <label htmlFor="ar-contact-email" className="text-sm font-medium text-gn-text">
              {t("contactEmailLabel")}
            </label>
            <input
              id="ar-contact-email"
              type="email"
              autoComplete="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-bg px-3 py-2.5 text-sm text-gn-text outline-none focus:border-gn-accent/50 focus:ring-2 focus:ring-gn-accent/20"
            />
          </div>
          <div>
            <label htmlFor="ar-username" className="text-sm font-medium text-gn-text">
              {t("usernameLabel")}
            </label>
            <input
              id="ar-username"
              type="text"
              autoComplete="username"
              placeholder={t("usernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-bg px-3 py-2.5 text-sm text-gn-text outline-none focus:border-gn-accent/50 focus:ring-2 focus:ring-gn-accent/20"
            />
          </div>
          <div>
            <label htmlFor="ar-message" className="text-sm font-medium text-gn-text">
              {t("messageLabel")}
            </label>
            <textarea
              id="ar-message"
              rows={4}
              placeholder={t("messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 w-full resize-y rounded-xl border border-gn-border bg-gn-bg px-3 py-2.5 text-sm text-gn-text outline-none focus:border-gn-accent/50 focus:ring-2 focus:ring-gn-accent/20"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gn-accent py-3 text-sm font-semibold text-black hover:bg-gn-accent-hover disabled:opacity-50"
          >
            {loading ? <Spinner /> : null}
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>
      )}
    </div>
  );
}
