import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/auth/AuthGate";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="protected" redirectTo="/login">
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
