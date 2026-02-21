import { getCompanyUsers, getCompanyUserLimitInfo } from "@/lib/api";
import { UsersTableClient } from "./users-table-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UsersPage({ params }: PageProps) {
  const { id } = await params;
  const [users, limitInfo] = await Promise.all([
    getCompanyUsers(id),
    getCompanyUserLimitInfo(id),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <UsersTableClient users={users} companyId={id} limitInfo={limitInfo} />
    </div>
  );
}