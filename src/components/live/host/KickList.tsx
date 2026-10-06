"use client";

import { useState } from "react";
import { game } from "../game-theme";

/** Apodos de la partida; tocar dos veces uno saca a ese jugador. Lobby y panel de jugadores. */
export default function KickList({ nicknames, onKick }: { nicknames: string[]; onKick: (nickname: string) => void }) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 1200 }}>
      {nicknames.map((n) => (
        <li key={n} className="live-pop">
          <button
            type="button"
            className="btn-live"
            title={confirming === n ? "Tocar de nuevo para sacarlo" : "Tocar para sacar de la partida"}
            onClick={() => {
              if (confirming === n) {
                setConfirming(null);
                onKick(n);
              } else {
                setConfirming(n);
                setTimeout(() => setConfirming((c) => (c === n ? null : c)), 3000);
              }
            }}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "clamp(15px, 1.4vw, 20px)",
              background: confirming === n ? game.danger : game.surfaceStrong,
              color: game.text,
            }}
          >
            {confirming === n ? `¿Sacar a ${n}?` : n}
          </button>
        </li>
      ))}
    </ul>
  );
}
