import { AdminOverviewPage } from "@/components/admin/AdminOverviewPage";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";

export default function AdminHomePage() {
  return (
    <AppMobileTabPageShell>
      <AdminOverviewPage />
    </AppMobileTabPageShell>
  );
}
