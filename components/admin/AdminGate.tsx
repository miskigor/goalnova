"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type AdminGateProps = {
  children: React.ReactNode;
  /**
   * When set, non-admins are sent here after load (no access-denied card).
   * Omit to show the standard access denied message + link home.
   */
  redirectNonAdminsTo?: string;
};

/**
 * Wrap `/admin/*` pages: only the bootstrap owner email can see the admin UI.
 */
export function AdminGate({ children, redirectNonAdminsTo }: AdminGateProps) {
  const t = useTranslations("adminScoutVerification");
  const router = useRouter();
  const { loaded, isAdmin, error } = useAdminAccess();

  useEffect(() => {
    if (!loaded || isAdmin || error) return;
    if (redirectNonAdminsTo) {
      router.replace(redirectNonAdminsTo);
    }
  }, [loaded, isAdmin, error, redirectNonAdminsTo, router]);

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center text-sm text-red-200">
        <p className="font-medium text-red-100">{t("accessCheckFailed")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black"
        >
          {t("refresh")}
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    if (redirectNonAdminsTo) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gn-text-secondary">
          {t("redirecting")}
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-8 text-center">
        <h1 className="text-lg font-semibold text-gn-text">
          {t("accessDeniedTitle")}
        </h1>
        <p className="text-sm text-gn-text-secondary">{t("accessDeniedBody")}</p>
        <Link
          href="/home"
          className="inline-flex rounded-xl bg-gn-accent px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
        >
          {t("backHome")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
