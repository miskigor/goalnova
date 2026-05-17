import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/auth/AuthGate";
import { EmailConfirmationGate } from "@/components/auth/EmailConfirmationGate";
import { RoleOnboardingGate } from "@/components/auth/RoleOnboardingGate";
import { RequireReauthOnReturn } from "@/components/auth/RequireReauthOnReturn";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="protected" redirectTo="/login">
      <EmailConfirmationGate>
      <RoleOnboardingGate mode="require-onboarding">
        <RequireReauthOnReturn />
        <AppShell>{children}</AppShell>
      </RoleOnboardingGate>
      </EmailConfirmationGate>
    </AuthGate>
  );
}
