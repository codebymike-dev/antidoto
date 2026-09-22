"use client";

import { useState } from "react";
import { isChallengeSnapshot, type ChallengeSnapshot, type PlayerSnapshot } from "@/lib/live-protocol";
import GameBackdrop from "../GameBackdrop";
import { game } from "../game-theme";
import JoinForm from "./JoinForm";
import PlayerGame from "./PlayerGame";
import ChallengeGame from "./ChallengeGame";

interface Props {
  initial: PlayerSnapshot | ChallengeSnapshot | null;
  initialPin: string;
  policyText: string;
  termsText: string;
}

export default function PlayerApp({ initial, initialPin, policyText, termsText }: Props) {
  const [snapshot, setSnapshot] = useState(initial);

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
      }}
    >
      <GameBackdrop />
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
  );
}
