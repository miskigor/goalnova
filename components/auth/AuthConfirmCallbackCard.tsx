"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { consumeAuthRedirectFromUrl } from "@/lib/auth/consumeAuthRedirectFromUrl";
import { isEmailConfirmed } from "@/lib/auth/emailConfirmed";
import { setFreshLogin } from "@/lib/auth/freshLogin";
import { supabase } from "@/lib/supabase/client";
import {
  resolvePostOnboardingHomePath,
  roleOnboardingHref,
} from "@/lib/onboarding/roleOnboardingPaths";
import { needsRoleOnboardingPage } from "@/lib/supabase/referrals";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

type Status = "working" | "confirmed" | "failed";

/**
 * Landing page for Supabase signup confirmation links (`emailRedirectTo`).
 */
export function AuthConfirmCallbackCard() {
  const tSignup = useTranslations("authSignup");
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("working");
  const settledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await consumeAuthRedirectFromUrl();
      if (cancelled || settledRef.current) return;

      const { data: userData, error } = await supabase.auth.getUser();
      if (error) {
        setStatus("failed");
        settledRef.current = true;
        return;
      }

      if (isEmailConfirmed(userData.user)) {
        settledRef.current = true;
        setStatus("confirmed");
        setFreshLogin();
        const needsRole = await needsRoleOnboardingPage();
        if (needsRole) {
          router.replace(await roleOnboardingHref());
        } else {
          router.replace(await resolvePostOnboardingHomePath());
        }
        return;
      }

      settledRef.current = true;
      setStatus("failed");
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [locale, router]);

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
          {status === "working"
            ? tSignup("emailConfirmLinkWorking")
            : status === "confirmed"
              ? tSignup("emailConfirmLinkSuccess")
              : tSignup("emailConfirmLinkFailed")}
        </p>
      </div>

      {status === "failed" ? (
        <div className="mt-6">
          <Link
            href="/login"
            className={`${GN_PRIMARY_BUTTON_CLASS} flex min-h-11 w-full items-center justify-center px-4 py-3 text-sm`}
          >
            {tSignup("confirmEmailGoToLogin")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
