"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { applyGateSessionSnapshot, type AuthSnapshotState } from "@/lib/auth/applyGateSessionSnapshot";
import { clearFreshLogin, setFreshLogin } from "@/lib/auth/freshLogin";
import {
  readGateSessionSnapshot,
  readSyncGateSessionSnapshot,
  seedGateSessionSnapshot,
} from "@/lib/auth/gateSessionSnapshot";
import {
  consumeAuthRedirectFromUrl,
  urlHasPendingAuthRedirect,
} from "@/lib/auth/consumeAuthRedirectFromUrl";
import { rememberPendingConfirmEmail } from "@/lib/auth/pendingConfirmEmail";
import {
  recoverStaleSupabaseSession,
  hasSupabaseAuthStorage,
} from "@/lib/auth/staleSessionRecovery";
import { PitchruschLoadingScreen } from "@/components/loading/PitchruschLoadingScreen";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

type AuthGateMode = "protected" | "guest";

type AuthGateProps = {
  mode: AuthGateMode;
  redirectTo: string;
  children: React.ReactNode;
};

/** OAuth redirect (PKCE `code` or legacy implicit hash tokens). */
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

function isManualGuestAuthPath(pathname: string): boolean {
  return GUEST_MANUAL_AUTH_PATHS.has(pathname);
}

const INITIAL_SESSION_GRACE_MS = 0;

function readInitialAuthState(): AuthSnapshotState & { checking: boolean } {
  if (typeof window === "undefined") {
    return {
      checking: true,
      session: null,
      isAuthenticated: false,
      emailConfirmed: null,
    };
  }

  if (!oauthReturnLikely() && !hasSupabaseAuthStorage()) {
    return {
      checking: false,
      session: null,
      isAuthenticated: false,
      emailConfirmed: null,
    };
  }

  const snapshot = readSyncGateSessionSnapshot();
  if (snapshot.session || snapshot.user?.id) {
    return { checking: false, ...applyGateSessionSnapshot(snapshot) };
  }

  return {
    checking: true,
    session: null,
    isAuthenticated: false,
    emailConfirmed: null,
  };
}

export function AuthGate({ mode, redirectTo, children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const didRedirectRef = useRef(false);

  useLayoutEffect(() => {
    const initial = readInitialAuthState();
    if (
      mode === "guest" &&
      isManualGuestAuthPath(pathname) &&
      !oauthReturnLikely()
    ) {
      setSession(initial.session);
      setIsAuthenticated(initial.isAuthenticated ?? false);
      setEmailConfirmed(initial.emailConfirmed);
      setChecking(false);
      return;
    }
    setSession(initial.session);
    setIsAuthenticated(initial.isAuthenticated);
    setEmailConfirmed(initial.emailConfirmed);
    setChecking(initial.checking);
  }, [mode, pathname]);

  useEffect(() => {
    const ms = oauthReturnLikely() ? 12_000 : 4_000;
    const id = window.setTimeout(() => {
      setChecking((c) => {
        if (!c) return c;
        setIsAuthenticated((prev) => (prev === null ? false : prev));
        return false;
      });
    }, ms);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let mounted = true;
    let initSettled = false;

    const applySnapshot = (snapshot: ReturnType<typeof applyGateSessionSnapshot>) => {
      setSession(snapshot.session);
      setIsAuthenticated(snapshot.isAuthenticated);
      setEmailConfirmed(snapshot.emailConfirmed);
    };

    const finishInit = () => {
      if (!mounted || initSettled) return;
      initSettled = true;
      setIsAuthenticated((prev) => (prev === null ? false : prev));
      setChecking(false);
    };

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
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

        if (!initSettled && event === "INITIAL_SESSION") {
          if (nextSession) {
            seedGateSessionSnapshot(nextSession);
          }
          applySnapshot(
            applyGateSessionSnapshot({
              session: nextSession,
              user: nextSession?.user ?? null,
            }),
          );
          finishInit();
          return;
        }

        if (nextSession) {
          seedGateSessionSnapshot(nextSession);
        }
        applySnapshot(
          applyGateSessionSnapshot({
            session: nextSession,
            user: nextSession?.user ?? null,
          }),
        );
      },
    );

    async function init() {
      if (
        mode === "guest" &&
        isManualGuestAuthPath(pathname) &&
        !oauthReturnLikely()
      ) {
        finishInit();
        return;
      }

      if (urlHasPendingAuthRedirect()) {
        await consumeAuthRedirectFromUrl();
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, INITIAL_SESSION_GRACE_MS);
      });
      if (!mounted || initSettled) return;

      if (!oauthReturnLikely() && !hasSupabaseAuthStorage()) {
        applySnapshot({
          session: null,
          isAuthenticated: false,
          emailConfirmed: null,
        });
        finishInit();
        return;
      }

      const snapshot = await readGateSessionSnapshot("AuthGate");
      if (!mounted || initSettled) return;

      if (snapshot.session) {
        seedGateSessionSnapshot(snapshot.session);
      }
      applySnapshot(applyGateSessionSnapshot(snapshot));
      finishInit();
    }

    void init();

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [mode, pathname]);

  useEffect(() => {
    if (checking) return;

    const isLoggedIn = isAuthenticated ?? Boolean(session);

    if (mode === "protected") {
      if (!isLoggedIn && !didRedirectRef.current) {
        didRedirectRef.current = true;
        router.replace(redirectTo);
        return;
      }

      if (isLoggedIn && emailConfirmed === false && !didRedirectRef.current) {
        didRedirectRef.current = true;
        void (async () => {
          clearFreshLogin();
          const email =
            session?.user?.email ??
            (await readGateSessionSnapshot("AuthGate")).user?.email;
          rememberPendingConfirmEmail(email);
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
        const email =
          session?.user?.email ??
          (await readGateSessionSnapshot("AuthGate")).user?.email;
        rememberPendingConfirmEmail(email);
        await supabase.auth.signOut({ scope: "local" });
        router.replace(CONFIRM_EMAIL_PATH);
      })();
    }
  }, [checking, isAuthenticated, emailConfirmed, mode, pathname, redirectTo, router, session]);

  if (checking) {
    return <PitchruschLoadingScreen />;
  }

  const isLoggedIn = isAuthenticated ?? Boolean(session);

  const guestAuthSnapshotPending =
    mode === "guest" && !checking && isAuthenticated === null && session === null;

  const blockedUnconfirmed =
    mode === "protected" && isLoggedIn && emailConfirmed === false;

  if ((mode === "protected" && !isLoggedIn) || blockedUnconfirmed) {
    return <PitchruschLoadingScreen />;
  }

  if (mode === "guest" && guestAuthSnapshotPending) {
    return <PitchruschLoadingScreen />;
  }

  return <>{children}</>;
}
