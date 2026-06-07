"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { isEmailConfirmed } from "@/lib/auth/emailConfirmed";
import {
  clearFreshLogin,
  hasFreshLogin,
  setFreshLogin,
} from "@/lib/auth/freshLogin";
import {
  consumeAuthRedirectFromUrl,
  urlHasPendingAuthRedirect,
} from "@/lib/auth/consumeAuthRedirectFromUrl";
import { rememberPendingConfirmEmail } from "@/lib/auth/pendingConfirmEmail";
import {
  recoverIfInvalidRefreshToken,
  recoverStaleSupabaseSession,
  hasSupabaseAuthStorage,
} from "@/lib/auth/staleSessionRecovery";
import { AppChromeLayout } from "@/components/layout/AppChromeLayout";
import { PitchruschLoadingScreen } from "@/components/loading/PitchruschLoadingScreen";
import { devError, devWarn } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

type AuthGateMode = "protected" | "guest";

type AuthGateProps = {
  mode: AuthGateMode;
  redirectTo: string;
  children: React.ReactNode;
};

/** OAuth redirect (PKCE `code` or legacy implicit hash tokens) — session exchange can outpace a short `getSession` timeout. */
function oauthReturnLikely(): boolean {
  if (typeof window === "undefined") return false;
  const { search, hash } = window.location;
  return (
    /(?:^|[?&])code=/.test(search) ||
    /(^|[#&])access_token=/.test(hash) ||
    /(^|[#&])refresh_token=/.test(hash)
  );
}

const CONFIRM_EMAIL_PATH = "/confirm-email";

/** Guest routes that always render their form — no auto-redirect from a persisted Supabase session. */
const GUEST_MANUAL_AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  CONFIRM_EMAIL_PATH,
]);

function protectedChromeLoading(
  mode: AuthGateMode,
  node: React.ReactNode,
): React.ReactNode {
  if (mode !== "protected") return node;
  return <AppChromeLayout>{node}</AppChromeLayout>;
}

export function AuthGate({ mode, redirectTo, children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // Prevent redirect loops from repeated auth-state events.
  const didRedirectRef = useRef(false);

  // Last-resort unblock if auth init hangs on throttled mobile tabs.
  // Must stay ≥ OAuth PKCE `getSession` budget when `?code=` is present (see init timeout).
  useEffect(() => {
    const ms = oauthReturnLikely() ? 22_000 : 12_000;
    const id = window.setTimeout(() => {
      setChecking((c) => (c ? false : c));
    }, ms);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (urlHasPendingAuthRedirect()) {
        await consumeAuthRedirectFromUrl();
      }

      if (!oauthReturnLikely() && !hasSupabaseAuthStorage()) {
        if (!mounted) return;
        setSession(null);
        setIsAuthenticated(false);
        setEmailConfirmed(null);
        setChecking(false);
        return;
      }

      // Slow mobile/WLAN auth init must not fall through to getUser() too early (felt “broken”).
      const sessionTimeoutMs = oauthReturnLikely() ? 20_000 : 10_000;
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<"timeout">((resolve) => {
            window.setTimeout(() => resolve("timeout"), sessionTimeoutMs);
          }),
        ]);

        if (!mounted) return;

        if (result === "timeout") {
          devWarn(
            `AuthGate: getSession did not resolve within ${sessionTimeoutMs}ms; falling back to getUser`,
          );
          // Fallback for slow auth initialization: verify auth via getUser before redirecting.
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr && (await recoverIfInvalidRefreshToken(userErr))) {
            if (!mounted) return;
            setSession(null);
            setIsAuthenticated(false);
            setEmailConfirmed(null);
          } else {
            if (userErr) {
              devError("AuthGate: getUser fallback error", userErr);
            }
            const user = userData.user;
            const hasUser = Boolean(user?.id);
            setSession(null);
            setIsAuthenticated(hasUser);
            setEmailConfirmed(hasUser ? isEmailConfirmed(user) : null);
          }
        } else if (result.error && (await recoverIfInvalidRefreshToken(result.error))) {
          if (!mounted) return;
          setSession(null);
          setIsAuthenticated(false);
          setEmailConfirmed(null);
        } else {
          const nextSession = result.data.session ?? null;
          setSession(nextSession);
          setIsAuthenticated(Boolean(nextSession));
          setEmailConfirmed(
            nextSession ? isEmailConfirmed(nextSession.user) : null,
          );
        }
      } catch (err) {
        if (await recoverIfInvalidRefreshToken(err)) {
          if (!mounted) return;
          setSession(null);
          setIsAuthenticated(false);
          setEmailConfirmed(null);
          return;
        }
        devError("AuthGate: getSession error", err);
        if (!mounted) return;
        try {
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr && (await recoverIfInvalidRefreshToken(userErr))) {
            setSession(null);
            setIsAuthenticated(false);
            setEmailConfirmed(null);
          } else {
            if (userErr) {
              devError("AuthGate: getUser fallback-after-error failed", userErr);
            }
            const user = userData.user;
            setSession(null);
            setIsAuthenticated(Boolean(user?.id));
            setEmailConfirmed(user ? isEmailConfirmed(user) : null);
          }
        } catch (fallbackErr) {
          if (await recoverIfInvalidRefreshToken(fallbackErr)) {
            setSession(null);
            setIsAuthenticated(false);
            setEmailConfirmed(null);
          } else {
            devError("AuthGate: getUser fallback-after-error exception", fallbackErr);
            setSession(null);
            setIsAuthenticated(false);
            setEmailConfirmed(null);
          }
        }
      } finally {
        if (!mounted) return;
        setChecking(false);
      }
    }

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (event === "SIGNED_IN") {
          setFreshLogin();
        }
        if (event === "SIGNED_OUT" && !nextSession) {
          if (!mounted) return;
          setSession(null);
          setIsAuthenticated(false);
          setEmailConfirmed(null);
          void recoverStaleSupabaseSession();
          return;
        }
        setSession(nextSession);
        setIsAuthenticated(Boolean(nextSession));
        setEmailConfirmed(
          nextSession ? isEmailConfirmed(nextSession.user) : null,
        );
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (checking) return;

    const isLoggedIn = isAuthenticated ?? Boolean(session);

    if (mode === "protected") {
      if (!isLoggedIn && !didRedirectRef.current) {
        didRedirectRef.current = true;
        router.replace(redirectTo);
        return;
      }

      if (
        isLoggedIn &&
        !hasFreshLogin() &&
        !oauthReturnLikely() &&
        !didRedirectRef.current
      ) {
        didRedirectRef.current = true;
        void (async () => {
          clearFreshLogin();
          await supabase.auth.signOut({ scope: "local" });
          router.replace(redirectTo);
        })();
        return;
      }

      if (isLoggedIn && emailConfirmed === false && !didRedirectRef.current) {
        didRedirectRef.current = true;
        void (async () => {
          clearFreshLogin();
          const { data: userData } = await supabase.auth.getUser();
          const user = userData.user ?? session?.user;
          rememberPendingConfirmEmail(user?.email ?? session?.user.email);
          await supabase.auth.signOut({ scope: "local" });
          router.replace(CONFIRM_EMAIL_PATH);
        })();
      }
      return;
    }

    if (
      isLoggedIn &&
      emailConfirmed === false &&
      !GUEST_MANUAL_AUTH_PATHS.has(pathname) &&
      !didRedirectRef.current
    ) {
      didRedirectRef.current = true;
      void (async () => {
        clearFreshLogin();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user ?? session?.user;
        rememberPendingConfirmEmail(user?.email ?? session?.user.email);
        await supabase.auth.signOut({ scope: "local" });
        router.replace(CONFIRM_EMAIL_PATH);
      })();
    }
  }, [checking, isAuthenticated, emailConfirmed, mode, pathname, redirectTo, router, session]);

  if (checking) {
    return protectedChromeLoading(
      mode,
      <PitchruschLoadingScreen fullScreen={false} />,
    );
  }

  const isLoggedIn = isAuthenticated ?? Boolean(session);

  /**
   * The fail-open `setChecking(false)` timeout can fire before `init()` applies Supabase state.
   * In that window `isAuthenticated` and `session` are still initial `null`, so we would render
   * guest children and `LoginCard` can briefly paint “already signed in” once its own
   * `getSession` resolves. Treat that as still loading for guest routes.
   */
  const guestAuthSnapshotPending =
    mode === "guest" && !checking && isAuthenticated === null && session === null;

  const blockedUnconfirmed =
    mode === "protected" && isLoggedIn && emailConfirmed === false;

  const staleSessionWithoutFreshLogin =
    mode === "protected" &&
    isLoggedIn &&
    !hasFreshLogin() &&
    !oauthReturnLikely();

  if (staleSessionWithoutFreshLogin) {
    return <PitchruschLoadingScreen fullScreen={false} />;
  }

  if ((mode === "protected" && !isLoggedIn) || blockedUnconfirmed) {
    return protectedChromeLoading(
      mode,
      <PitchruschLoadingScreen fullScreen={false} />,
    );
  }

  if (mode === "guest" && guestAuthSnapshotPending) {
    return <PitchruschLoadingScreen fullScreen={false} />;
  }

  return <>{children}</>;
}

