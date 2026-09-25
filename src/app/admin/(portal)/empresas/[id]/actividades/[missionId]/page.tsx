import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getCompany } from "@/lib/queries";
import ActivityResults from "@/components/admin/ActivityResults";

export const dynamic = "force-dynamic";

/** Resultados de una actividad solo para una empresa. */
export default async function EmpresaActividadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; missionId: string }>;
  searchParams: Promise<{ estado?: string }>;
}) {
  const { id, missionId } = await params;
  const { estado = "todos" } = await searchParams;
  const user = (await currentUser())!;
  const companyId = Number(id);
  if (!Number.isInteger(companyId) || companyId <= 0) notFound();
  if (user.role === "empresa" && user.company_id !== companyId) notFound();
  const company = await getCompany(companyId);
  if (!company || company.archived) notFound();

  return (
    <ActivityResults
      missionId={missionId}
      user={user}
      company={{ id: company.id, name: company.name }}
      q=""
      estado={estado}
    />
  );
}
