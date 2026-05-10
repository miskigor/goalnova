"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { devError } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

type AuthGateMode = "protected" | "guest";

type AuthGateProps = {
  mode: AuthGateMode;
  redirectTo: string;
  children: React.ReactNode;
};

function isInvalidRefreshTokenError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rawMessage =
    "message" in err && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : "";
  const lower = rawMessage.toLowerCase();
  return lower.includes("invalid refresh token") || lower.includes("refresh token not found");
}

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

/** Allow the login screen to render even with an active session (e.g. Google) so users can switch accounts. */
function isLoginRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/login" || normalized.endsWith("/login");
}

function InlineSpinner() {
  return (
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
  );
}

export function AuthGate({ mode, redirectTo, children }: AuthGateProps) {
  const tCommon = useTranslations("authCommon");
  const router = useRouter();
  const pathname = usePathname();
  const onLoginUrl = isLoginRoute(pathname);

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
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
          devError(
            `AuthGate: getSession did not resolve within ${sessionTimeoutMs}ms; falling back to getUser`,
          );
          // Fallback for slow auth initialization: verify auth via getUser before redirecting.
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr) {
            devError("AuthGate: getUser fallback error", userErr);
          }
          const hasUser = Boolean(userData.user?.id);
          setSession(null);
          setIsAuthenticated(hasUser);
        } else {
          setSession(result.data.session ?? null);
          setIsAuthenticated(Boolean(result.data.session));
        }
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) {
          // Common on mobile Safari/dev LAN after stale auth cache.
          // Clear local Supabase session so user can log in normally.
          await supabase.auth.signOut({ scope: "local" });
          if (!mounted) return;
          setSession(null);
          setIsAuthenticated(false);
          return;
        }
        devError("AuthGate: getSession error", err);
        if (!mounted) return;
        try {
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr) {
            devError("AuthGate: getUser fallback-after-error failed", userErr);
          }
          setSession(null);
          setIsAuthenticated(Boolean(userData.user?.id));
        } catch (fallbackErr) {
          devError("AuthGate: getUser fallback-after-error exception", fallbackErr);
          setSession(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!mounted) return;
        setChecking(false);
      }
    }

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setIsAuthenticated(Boolean(nextSession));
      }
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
      }
      return;
    }

    // guest mode — do not auto-redirect away from /login (email/password form must stay reachable).
    if (mode === "guest" && isLoggedIn && onLoginUrl) {
      return;
    }

    if (isLoggedIn && !didRedirectRef.current) {
      didRedirectRef.current = true;
      router.replace(redirectTo);
    }
  }, [checking, isAuthenticated, mode, onLoginUrl, redirectTo, router, session]);

  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gn-text-secondary">
          <InlineSpinner />
          {tCommon("loading")}
        </div>
      </div>
    );
  }

  const isLoggedIn = isAuthenticated ?? Boolean(session);

  if (mode === "protected" && !isLoggedIn) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gn-text-secondary">
          <InlineSpinner />
          {tCommon("loading")}
        </div>
      </div>
    );
  }
  if (mode === "guest" && isLoggedIn && !onLoginUrl) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gn-text-secondary">
          <InlineSpinner />
          {tCommon("loading")}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

