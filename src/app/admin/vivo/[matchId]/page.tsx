import type { Metadata } from "next";
import { publicOrigin } from "@/lib/public-origin";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getMatchForHost, hostSnapshot } from "@/lib/live-match";
import HostScreen from "@/components/live/host/HostScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partida en vivo",
  robots: { index: false, follow: false },
};

// Fuera del layout del portal a propósito: es la pantalla del proyector, sin menú lateral.
export default async function VivoPage({ params }: { params: Promise<{ matchId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  const { matchId } = await params;
  // Un desafío no tiene pantalla de proyector: su página es la del reporte, con el enlace.
  const match = await getMatchForHost(Number(matchId), user);
  if (match?.closes_at) redirect(`/admin/juegos/${match.game_id}/partidas/${match.id}`);
  const res = await hostSnapshot(Number(matchId), user);
  if (!res.ok) notFound();

  const { host, origin } = await publicOrigin();

  return (
    <HostScreen
      initial={res.snapshot}
      joinHost={host}
      joinUrl={`${origin}/jugar?pin=${res.snapshot.pin}`}
    />
  );
}
