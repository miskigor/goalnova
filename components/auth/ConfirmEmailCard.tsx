"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { peekPendingConfirmEmail } from "@/lib/auth/pendingConfirmEmail";
import { resendSignupConfirmationEmail } from "@/lib/supabase/auth";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";

export function ConfirmEmailCard() {
  const tSignup = useTranslations("authSignup");
  const tCommon = useTranslations("authCommon");

  const [email, setEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error" | "rate_limited">(
    "idle",
  );

  useEffect(() => {
    setEmail(peekPendingConfirmEmail());
  }, []);

  async function onResend() {
    const target = email ?? peekPendingConfirmEmail();
    if (!target) {
      setResendStatus("error");
      return;
    }
    setResending(true);
    setResendStatus("idle");
    try {
      const result = await resendSignupConfirmationEmail(target);
      if (result.status === "sent") setResendStatus("sent");
      else if (result.status === "rate_limited") setResendStatus("rate_limited");
      else setResendStatus("error");
    } catch {
      setResendStatus("error");
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      className="mx-auto w-full rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-8"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <Logo href="/" variant="entry" className="justify-center" showWordmark={false} />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-gn-text sm:mt-6">
          {tSignup("confirmEmailTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gn-text-secondary">
          {tSignup("confirmEmailBody")}
        </p>
        {email ? (
          <p className="mt-2 truncate text-xs text-gn-text-tertiary">{email}</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/login"
          className={`${GN_PRIMARY_BUTTON_CLASS} flex min-h-11 w-full items-center justify-center px-4 py-3 text-sm`}
        >
          {tSignup("confirmEmailGoToLogin")}
        </Link>

        {email ? (
          <button
            type="button"
            onClick={() => void onResend()}
            disabled={resending}
            className={`${GN_SECONDARY_BUTTON_CLASS} flex min-h-11 w-full items-center justify-center px-4 py-3 text-sm disabled:opacity-60`}
          >
            {resending ? tSignup("confirmEmailResending") : tSignup("confirmEmailResend")}
          </button>
        ) : null}
      </div>

      {resendStatus === "sent" ? (
        <p className="mt-3 text-center text-xs text-emerald-300/90" role="status">
          {tSignup("confirmEmailResent")}
        </p>
      ) : null}
      {resendStatus === "rate_limited" ? (
        <p className="mt-3 text-center text-xs text-amber-200/90" role="status">
          {tSignup("confirmEmailResendRateLimited")}
        </p>
      ) : null}
      {resendStatus === "error" ? (
        <p className="mt-3 text-center text-xs text-red-300/90" role="alert">
          {tSignup("confirmEmailResendError")}
        </p>
      ) : null}

      {!email ? (
        <p className="mt-4 text-center text-xs text-gn-text-tertiary">{tCommon("genericError")}</p>
      ) : null}
    </div>
  );
}
