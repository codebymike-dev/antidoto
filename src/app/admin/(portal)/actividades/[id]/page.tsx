import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import ActivityResults from "@/components/admin/ActivityResults";

export const dynamic = "force-dynamic";

/** Resultados de una actividad en todas las empresas. El admin de empresa ve solo la suya. */
export default async function DetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { id } = await params;
  const { q = "", estado = "todos" } = await searchParams;
  const user = (await currentUser())!;
  if (user.role === "empresa") redirect(`/admin/empresas/${user.company_id}/actividades/${id}`);

  return <ActivityResults missionId={id} user={user} company={null} q={q} estado={estado} />;
}
