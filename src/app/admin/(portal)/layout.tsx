import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/queries";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal admin",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  const notifications = await listNotifications(user);

  return (
    <AdminShell
      roleTitle={user.role === "empresa" ? "Admin de empresa" : "Superadmin"}
      roleSubtitle={user.role === "empresa" ? user.company_name ?? "" : "Acceso total"}
      notifications={notifications}
    >
      {children}
    </AdminShell>
  );
}
