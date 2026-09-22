import type { Metadata } from "next";
import { getLegalTexts } from "@/lib/queries";
import { playerSnapshot } from "@/lib/live-match";
import { playerIdFromCookie } from "@/lib/live-http";
import PlayerApp from "@/components/live/player/PlayerApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jugar en vivo",
  description: "Entra a la partida en vivo con el PIN que ves en la pantalla.",
};

const LEGAL_NO_DISPONIBLE =
  "No pudimos cargar este texto en este momento. Escríbenos a antidotocolombia.com si necesitas consultarlo.";

export default async function JugarPage({ searchParams }: { searchParams: Promise<{ pin?: string }> }) {
  const { pin = "" } = await searchParams;

  // Si ya está en una partida (recargó, o volvió desde otra app), sigue donde estaba.
  const playerId = await playerIdFromCookie();
  const current = playerId ? await playerSnapshot(playerId) : null;
  const initial = current?.ok && !current.snapshot.kicked ? current.snapshot : null;

  const legal = await getLegalTexts().catch(() => ({ privacidad: LEGAL_NO_DISPONIBLE, terminos: LEGAL_NO_DISPONIBLE }));

  return (
    <PlayerApp
      initial={initial}
      initialPin={pin.replace(/\D/g, "").slice(0, 6)}
      policyText={legal.privacidad}
      termsText={legal.terminos}
    />
  );
}
