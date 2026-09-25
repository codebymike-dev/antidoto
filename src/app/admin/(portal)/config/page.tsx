import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

// Configuración se repartió: empresas y códigos en /admin/empresas, textos legales e
// historial en /admin/ajustes. Se conserva para enlaces viejos.
export default async function ConfigPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = (await currentUser())!;
  const { tab } = await searchParams;
  if (user.role === "empresa") redirect(`/admin/empresas/${user.company_id}`);
  if (tab === "legal") redirect("/admin/ajustes?tab=legal");
  if (tab === "auditoria") redirect("/admin/ajustes?tab=historial");
  if (tab === "codes") redirect("/admin");
  redirect("/admin/empresas");
}
