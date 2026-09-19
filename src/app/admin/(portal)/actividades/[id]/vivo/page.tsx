import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getMission, listGroups } from "@/lib/queries";
import AdminLive from "@/components/admin/AdminLive";

export const dynamic = "force-dynamic";

export default async function VivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await currentUser())!;

  const mission = await getMission(id);
  if (!mission) notFound();

  const groups = await listGroups(id, user);
  // Estimación inicial de asistentes: la sesión en vivo aún no tiene canal real.
  const connected = Math.max(3, Math.round(groups.reduce((a, g) => a + g.participantes, 0) * 0.25));

  return (
    <AdminLive
      missionId={mission.id}
      missionTitle={mission.title}
      groups={groups.map((g) => ({ codigo: g.codigo, empresa: g.empresa }))}
      initialConnected={connected}
    />
  );
}
