"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyHostEvent, applyPublicEvent, remainingMs } from "@/lib/live-client-state";
import { ANSWER_GRACE_MS, type HostCommand } from "@/lib/live-engine";
import type { HostSnapshot } from "@/lib/live-protocol";
import { clockOffset, useLiveChannel } from "../useLiveChannel";
import GameBackdrop from "../GameBackdrop";
import { calSans, formatPin, game, liveGhostButton } from "../game-theme";
import HostLobby from "./HostLobby";
import HostQuestion from "./HostQuestion";
import HostReveal from "./HostReveal";
import HostLeaderboard from "./HostLeaderboard";
import HostPodium from "./HostPodium";
import { useHostSound, useSoundState } from "./useHostSound";
import { liveSound } from "../sound";

interface Props {
  initial: HostSnapshot;
  joinHost: string;
  joinUrl: string;
}

export default function HostScreen({ initial, joinHost, joinUrl }: Props) {
  const matchId = initial.matchId;
  const [state, setState] = useState(initial);
  // Desfase entre el reloj del servidor y el del proyector; se corrige con cada evento.
  const [offset, setOffset] = useState(() => clockOffset(initial.serverNow));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const resync = useCallback(async () => {
    const res = await fetch(`/api/live/host/${matchId}`, { cache: "no-store" });
    if (!res.ok) return;
    const snapshot: HostSnapshot = await res.json();
    setState(snapshot);
    setOffset(clockOffset(snapshot.serverNow));
  }, [matchId]);

  const { connection } = useLiveChannel({
    matchId,
    role: "host",
    onPublic: (event) => {
      setState((s) => applyPublicEvent(s, event));
      if ("serverNow" in event.data) setOffset(clockOffset(event.data.serverNow));
    },
    onHost: (event) => setState((s) => applyHostEvent(s, event)),
    onResync: resync,
  });

  async function post(path: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/live/host/${matchId}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "No se pudo completar la acción.");
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setBusy(false);
      // Los eventos ya actualizan la pantalla; la foto completa cubre cualquier evento perdido.
      await resync();
    }
  }
  const command = (c: HostCommand) => post("command", { command: c });

  // La lista de jugadores y el contador viajan "a mejor esfuerzo" (pueden perderse con el
  // límite de Ably en ráfagas): mientras cambian, la foto completa los corrige.
  useEffect(() => {
    if (state.status !== "lobby" && state.status !== "question") return;
    const id = setInterval(() => void resync(), 2000);
    return () => clearInterval(id);
  }, [state.status, resync]);

  // Sin proceso vivo en el servidor: cuando el reloj llega al final, el host avisa y
  // el servidor decide con el suyo. Se reintenta mientras la pregunta siga abierta.
  const lastTick = useRef(0);
  useEffect(() => {
    const q = state.question;
    if (state.status !== "question" || !q || q.pausedRemainingMs !== null) return;
    const id = setInterval(() => {
      const serverNow = Date.now() + offset;
      if (remainingMs(q, offset) > 0 || serverNow < q.endsAt + ANSWER_GRACE_MS + 250) return;
      if (Date.now() - lastTick.current < 1500) return;
      lastTick.current = Date.now();
      void fetch(`/api/live/host/${matchId}/tick`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    }, 250);
    return () => clearInterval(id);
  }, [state.status, state.question, offset, matchId]);

  useHostSound(state, offset);
  const [soundReady, musicOn, effectsOn] = useSoundState().split("|").map((v) => v === "true");
  const sound = liveSound();

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }

  const isLast = (state.question?.position ?? 0) >= state.totalQuestions;
  const inGame = state.status !== "lobby" && state.status !== "finished";

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

      <main
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(20px, 4vh, 48px) clamp(20px, 4vw, 64px)",
          width: "100%",
          maxWidth: 1500,
          margin: "0 auto",
        }}
      >
        {state.status === "lobby" && (
          <HostLobby
            pin={state.pin}
            joinHost={joinHost}
            joinUrl={joinUrl}
            nicknames={state.nicknames}
            joinLocked={state.joinLocked}
            busy={busy}
            onStart={() => command("start")}
            onToggleLock={() => command(state.joinLocked ? "unlockJoin" : "lockJoin")}
            onKick={(nickname) => post("kick", { nickname })}
          />
        )}
        {state.status === "question" && state.question && (
          <HostQuestion
            question={state.question}
            offsetMs={offset}
            answered={state.answered}
            players={state.nicknames.length}
            busy={busy}
            onPauseToggle={() => command(state.question?.pausedRemainingMs !== null ? "resume" : "pause")}
            onSkip={() => command("endQuestion")}
          />
        )}
        {state.status === "reveal" && state.question && state.reveal && (
          <HostReveal
            question={state.question}
            reveal={state.reveal}
            isLast={isLast}
            busy={busy}
            onLeaderboard={() => command("showLeaderboard")}
            onNext={() => command("next")}
          />
        )}
        {state.status === "leaderboard" && (
          <HostLeaderboard entries={state.entries} isLast={isLast} busy={busy} onNext={() => command("next")} />
        )}
        {state.status === "finished" && (
          <HostPodium entries={state.entries} reportHref={`/admin/juegos/${state.gameId}/partidas/${matchId}`} />
        )}
      </main>

      {error && (
        <div
          role="alert"
          style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: game.danger, color: "#fff", padding: "10px 18px", borderRadius: 12, fontWeight: 600, zIndex: 10 }}
        >
          {error}
        </div>
      )}

      <footer
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px clamp(16px, 3vw, 40px)",
          borderTop: `1px solid ${game.border}`,
          background: "rgba(15,24,29,0.85)",
          flexWrap: "wrap",
          fontSize: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: game.muted }}>
          <span style={{ fontWeight: 600, color: game.text }}>{state.gameTitle}</span>
          {inGame && (
            <span>
              PIN <strong style={{ ...calSans, color: game.text, fontSize: 18 }}>{formatPin(state.pin)}</strong>
            </span>
          )}
          {inGame && <span>{state.nicknames.length} jugadores</span>}
          {(connection === "disconnected" || connection === "suspended") && (
            <span role="status" style={{ color: "#E8A33D", fontWeight: 600 }}>
              Reconectando…
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {inGame && (
            <button type="button" className="btn-live" style={{ ...liveGhostButton, height: 38, fontSize: 13 }} onClick={() => command(state.joinLocked ? "unlockJoin" : "lockJoin")} disabled={busy}>
              {state.joinLocked ? "Abrir la entrada" : "Cerrar la entrada"}
            </button>
          )}
          {soundReady ? (
            <>
              <button
                type="button"
                className="btn-live"
                aria-pressed={musicOn}
                style={{ ...liveGhostButton, height: 38, fontSize: 13, opacity: musicOn ? 1 : 0.55 }}
                onClick={() => sound.setPrefs({ music: !musicOn })}
              >
                Música {musicOn ? "sí" : "no"}
              </button>
              <button
                type="button"
                className="btn-live"
                aria-pressed={effectsOn}
                style={{ ...liveGhostButton, height: 38, fontSize: 13, opacity: effectsOn ? 1 : 0.55 }}
                onClick={() => sound.setPrefs({ effects: !effectsOn })}
              >
                Efectos {effectsOn ? "sí" : "no"}
              </button>
            </>
          ) : (
            <button type="button" className="btn-live" style={{ ...liveGhostButton, height: 38, fontSize: 13, background: "#E8A33D", color: "#0F181D" }} onClick={() => sound.unlock()}>
              Activar sonido
            </button>
          )}
          <button type="button" className="btn-live" style={{ ...liveGhostButton, height: 38, fontSize: 13 }} onClick={toggleFullscreen}>
            Pantalla completa
          </button>
          {state.status !== "finished" && (
            <button
              type="button"
              className="btn-live"
              disabled={busy}
              onClick={() => {
                if (confirmFinish) {
                  setConfirmFinish(false);
                  void command("finish");
                } else {
                  setConfirmFinish(true);
                  setTimeout(() => setConfirmFinish(false), 3000);
                }
              }}
              style={{ ...liveGhostButton, height: 38, fontSize: 13, background: confirmFinish ? game.danger : liveGhostButton.background }}
            >
              {confirmFinish ? "¿Terminar la partida?" : "Terminar"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
