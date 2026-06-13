import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AppChromeLayout } from "@/components/layout/AppChromeLayout";
import { AuthGate } from "@/components/auth/AuthGate";
import { EmailConfirmationGate } from "@/components/auth/EmailConfirmationGate";
import { RoleOnboardingGate } from "@/components/auth/RoleOnboardingGate";
import { RequireReauthOnReturn } from "@/components/auth/RequireReauthOnReturn";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="protected" redirectTo="/login">
      <AppChromeLayout>
        <EmailConfirmationGate>
          <RoleOnboardingGate mode="require-onboarding">
            <RequireReauthOnReturn />
            <AppShell>{children}</AppShell>
          </RoleOnboardingGate>
        </EmailConfirmationGate>
      </AppChromeLayout>
    </AuthGate>
  );
}
