"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  resolvePostOnboardingHomePath,
  roleOnboardingHref,
} from "@/lib/onboarding/roleOnboardingPaths";
import {
  needsRoleOnboardingPage,
  syncPendingReferralCodeToUserMetadata,
} from "@/lib/supabase/referrals";

type Mode = "require-onboarding" | "require-complete";

type Props = {
  mode: Mode;
  children: React.ReactNode;
};

function GateSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-gn-text-secondary">
        <svg
          className="h-4 w-4 animate-spin text-gn-accent"
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
        {label}
      </div>
    </div>
  );
}

/**
 * App-wide role onboarding guard.
 * - require-onboarding: block main app until /role is complete
 * - require-complete: block /role when onboarding is already done
 */
export function RoleOnboardingGate({ mode, children }: Props) {
  const tCommon = useTranslations("authCommon");
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const didRedirectRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function evaluate() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) setAllowed(true);
        return;
      }

      await syncPendingReferralCodeToUserMetadata();
      const needsRole = await needsRoleOnboardingPage();
      if (cancelled) return;

      if (mode === "require-onboarding") {
        if (needsRole) {
          if (!didRedirectRef.current) {
            didRedirectRef.current = true;
            router.replace(await roleOnboardingHref());
          }
          return;
        }
        didRedirectRef.current = false;
        setAllowed(true);
        return;
      }

      // require-complete (/role only)
      if (!needsRole) {
        if (!didRedirectRef.current) {
          didRedirectRef.current = true;
          router.replace(await resolvePostOnboardingHomePath());
        }
        return;
      }
      didRedirectRef.current = false;
      setAllowed(true);
    }

    void evaluate();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      didRedirectRef.current = false;
      setAllowed(false);
      void evaluate();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [mode, router]);

  if (!allowed) {
    return <GateSpinner label={tCommon("loading")} />;
  }

  return <>{children}</>;
}
