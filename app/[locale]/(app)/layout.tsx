import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/auth/AuthGate";
import { RequireReauthOnReturn } from "@/components/auth/RequireReauthOnReturn";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="protected" redirectTo="/login">
      <RequireReauthOnReturn />
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
