import { AdminUserDetailPage } from "@/components/admin/AdminUserDetailPage";

type Props = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailRoute({ params }: Props) {
  const { userId } = await params;
  return <AdminUserDetailPage userId={userId} />;
}
