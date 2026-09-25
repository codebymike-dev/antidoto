"use client";

import { useState } from "react";
import { isChallengeSnapshot, type ChallengeSnapshot, type PlayerSnapshot } from "@/lib/live-protocol";
import GameBackdrop from "../GameBackdrop";
import { game } from "../game-theme";
import JoinForm from "./JoinForm";
import PlayerGame from "./PlayerGame";
import ChallengeGame from "./ChallengeGame";
import { brandCssVars, brandPalette } from "@/lib/brand-palette";
import BrandLogo from "@/components/BrandLogo";

interface Props {
  initial: PlayerSnapshot | ChallengeSnapshot | null;
  initialPin: string;
  policyText: string;
  termsText: string;
}

export default function PlayerApp({ initial, initialPin, policyText, termsText }: Props) {
  const [snapshot, setSnapshot] = useState(initial);
  // La marca es fija por partida: basta con la de la foto con que se entró.
  const brand = snapshot?.brand ?? null;

  async function leave() {
    await fetch("/api/live/leave", { method: "POST" }).catch(() => {});
    setSnapshot(null);
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100dvh",
        background: game.bg,
        color: game.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...(brand && brandCssVars(brandPalette(brand))),
      }}
    >
      <GameBackdrop />
      {brand && (
        <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "10px 16px 0" }}>
          <BrandLogo brand={brand} surface="oscuro" height={26} />
        </div>
      )}
      {/* Columna de ancho de lectura: en computador, preguntas y opciones de borde a borde cansan la vista. */}
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", width: "100%", maxWidth: 640, margin: "0 auto" }}>
        {snapshot ? (
          isChallengeSnapshot(snapshot) ? (
            <ChallengeGame key={snapshot.matchId} initial={snapshot} onLeave={leave} />
          ) : (
            <PlayerGame key={snapshot.matchId} initial={snapshot} onLeave={leave} />
          )
        ) : (
          <JoinForm initialPin={initialPin} policyText={policyText} termsText={termsText} onJoined={setSnapshot} />
        )}
      </div>
    </div>
  );
}
