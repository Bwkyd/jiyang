import { redirect } from "next/navigation";
import { getSession, requireAdmin } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // Check admin permission
  await requireAdmin();

  return (
    <div className="flex h-screen">
      <Sidebar userRole={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userName={user.name} userRole={user.role} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
