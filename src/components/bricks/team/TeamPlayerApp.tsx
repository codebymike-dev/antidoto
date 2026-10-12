"use client";

// Entrada a la construcción en equipo: PIN y apodo (el mismo formulario del quiz en vivo) y
// después el constructor conectado al equipo.

import { useState } from "react";
import type { PlayerView } from "@/lib/brick-session";
import { leaveBrickSession } from "@/lib/brick-actions";
import JoinForm from "@/components/live/player/JoinForm";
import GameBackdrop from "@/components/live/GameBackdrop";
import { game } from "@/components/live/game-theme";
import BuilderShell from "../builder/BuilderShell";

interface Props {
  initial: PlayerView | null;
  initialPin: string;
  policyText: string;
  termsText: string;
}

export default function TeamPlayerApp({ initial, initialPin, policyText, termsText }: Props) {
  const [view, setView] = useState<PlayerView | null>(initial);

  if (view) {
    return (
      <BuilderShell
        key={view.team.id}
        title={view.title}
        team={view}
        exitAction={leaveBrickSession}
        exitNote="Este celular olvidará la sesión. Lo que pusiste queda en la obra de tu equipo; para volver, entra otra vez con el PIN."
      />
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: game.bg, color: game.text, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <GameBackdrop />
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", width: "100%", maxWidth: 640, margin: "0 auto" }}>
        <JoinForm<PlayerView>
          initialPin={initialPin}
          policyText={policyText}
          termsText={termsText}
          onJoined={setView}
          api={{ join: "/api/bricks/join", me: "/api/bricks/me" }}
        />
      </div>
    </div>
  );
}
