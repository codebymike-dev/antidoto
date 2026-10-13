import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalTexts } from "@/lib/queries";
import { playerSnapshot } from "@/lib/brick-session";
import { brickPlayerId } from "@/lib/brick-http";
import TeamPlayerApp from "@/components/bricks/team/TeamPlayerApp";
import { BRICKS_VISIBLE } from "@/lib/bricks/visible";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Construir en equipo",
  description: "Entra a la construcción en equipo con el PIN que ves en la pantalla.",
};

const LEGAL_NO_DISPONIBLE =
  "No pudimos cargar este texto en este momento. Escríbenos a antidotocolombia.com si necesitas consultarlo.";

export default async function ConstruirPage({ searchParams }: { searchParams: Promise<{ pin?: string }> }) {
  if (!BRICKS_VISIBLE) notFound();
  const { pin = "" } = await searchParams;
  // Si ya está en una sesión abierta (recargó o volvió de otra app), sigue con su equipo.
  const playerId = await brickPlayerId();
  const current = playerId ? await playerSnapshot(playerId) : null;
  const initial = current?.ok && current.view.session.status !== "finished" ? current.view : null;
  const legal = await getLegalTexts().catch(() => ({ privacidad: LEGAL_NO_DISPONIBLE, terminos: LEGAL_NO_DISPONIBLE }));

  return <TeamPlayerApp initial={initial} initialPin={pin.replace(/\D/g, "").slice(0, 6)} policyText={legal.privacidad} termsText={legal.terminos} />;
}
