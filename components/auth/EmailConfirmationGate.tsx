"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { resolveGateAuthEventAction } from "@/lib/auth/gateAuthEvent";
import { readGateSessionSnapshot } from "@/lib/auth/gateSessionSnapshot";
import { isEmailConfirmed } from "@/lib/auth/emailConfirmed";
import { rememberPendingConfirmEmail } from "@/lib/auth/pendingConfirmEmail";
import { devError } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

type Props = {
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
 * Blocks app and onboarding routes until `user.email_confirmed_at` is set.
 * Runs after {@link AuthGate} (session required) and before role onboarding.
 */
export function EmailConfirmationGate({ children }: Props) {
  const tCommon = useTranslations("authCommon");
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const didRedirectRef = useRef(false);
  const allowedRef = useRef(false);
  const trackedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    allowedRef.current = allowed;
  }, [allowed]);

  useEffect(() => {
    let cancelled = false;

    async function evaluate(options?: {
      session?: Session | null;
      blockShell?: boolean;
    }) {
      if (options?.blockShell) {
        setAllowed(false);
      }

      const { session, user: sessionUser } = await readGateSessionSnapshot(
        "EmailConfirmationGate",
        options?.session !== undefined ? { session: options.session } : undefined,
      );
      if (!session && !sessionUser?.id) {
        trackedUserIdRef.current = null;
        if (!cancelled) setAllowed(true);
        return;
      }

      trackedUserIdRef.current =
        sessionUser?.id ?? session?.user?.id ?? null;

      let user = sessionUser;
      if (!user) {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          devError("EmailConfirmationGate: getUser failed", userErr);
        }
        user = userData.user ?? session?.user ?? null;
      }

      if (isEmailConfirmed(user)) {
        didRedirectRef.current = false;
        if (!cancelled) setAllowed(true);
        return;
      }

      if (!didRedirectRef.current) {
        didRedirectRef.current = true;
        rememberPendingConfirmEmail(user?.email ?? session?.user?.email);
        await supabase.auth.signOut({ scope: "local" });
        if (!cancelled) {
          router.replace("/confirm-email");
        }
      }
    }

    void evaluate({ blockShell: true });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const action = resolveGateAuthEventAction(event, session, {
        allowed: allowedRef.current,
        trackedUserId: trackedUserIdRef.current,
      });
      if (action === "skip") return;

      didRedirectRef.current = false;
      void evaluate({
        session,
        blockShell: action === "reevaluate-block",
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!allowed) {
    return <GateSpinner label={tCommon("loading")} />;
  }

  return <>{children}</>;
}
