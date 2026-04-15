import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/ui/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="app-layout">
      <Sidebar user={{ name: session.name, email: session.email, role: session.role }} />
      <main className="main-content">{children}</main>
    </div>
  );
}
