"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { HostSnapshot } from "@/lib/live-protocol";
import { liveSound } from "../sound";
import { REVEAL_AT, wordCloudTiming } from "./HostReveal";

/** Pops de entrada por foto de estado y separación entre ellos (s). */
const MAX_POPS = 6;
const POP_GAP = 0.07;

/** Estado del motor de audio (desbloqueado y preferencias) para los controles del host. */
export function useSoundState() {
  const sound = liveSound();
  return useSyncExternalStore(
    (fn) => sound.subscribe(fn),
    () => `${sound.ready}|${sound.prefs.music}|${sound.prefs.effects}|${sound.prefs.volume}`,
    () => "false|true|true|0.7"
  );
}

/**
 * Traduce los cambios de la partida en sonido. Mira transiciones (no estados) para que
 * cada efecto suene una vez aunque la pantalla se vuelva a pintar o se resincronice.
 */
export function useHostSound(state: HostSnapshot, offsetMs: number) {
  const sound = liveSound();
  const ready = useSoundState().startsWith("true");
  const prev = useRef<HostSnapshot | null>(null);
  const beeped = useRef<string>("");

  // El primer clic en cualquier parte de la pantalla desbloquea el audio.
  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [sound]);

  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (!ready) return;

    const q = state.question;
    const questionChanged = q && (before?.question?.position !== q.position || before?.status !== "question");

    // Música según la fase.
    if (state.status === "lobby") sound.playLobby();
    else if (state.status === "question" && q && q.pausedRemainingMs === null) {
      const msLeft = q.endsAt - (Date.now() + offsetMs);
      if (msLeft > 0) sound.playQuestion(msLeft);
    } else sound.stopMusic();

    if (!before) return;

    // Jugadores que entran: un pop por cada uno, con el tono subiendo. La foto llega cada
    // 2 s y puede traer varios juntos: se escalonan y se limitan para no saturar.
    if (state.status === "lobby" && state.nicknames.length > before.nicknames.length) {
      const first = Math.max(before.nicknames.length, state.nicknames.length - MAX_POPS);
      for (let i = first; i < state.nicknames.length; i++) sound.pop(i, (i - first) * POP_GAP);
    }
    if (questionChanged) sound.whoosh();
    if (state.status === "question" && before.status === "question" && state.answered > before.answered) sound.answer();
    if (state.status === "reveal" && before.status === "question" && q) {
      sound.gong();
      if (q.type === "nube") {
        const count = state.reveal?.words.length ?? 0;
        const { start, step, topAt } = wordCloudTiming(count);
        sound.wordCloud(count, start, step, topAt);
      } else {
        sound.risingTicks();
        // Solo quiz y VF tienen correcta; la encuesta no la "revela".
        if (q.type === "quiz" || q.type === "vf") sound.reveal(REVEAL_AT);
      }
    }
    if (state.status === "leaderboard" && before.status !== "leaderboard") sound.whoosh();
    // El podio suena desde HostPodium, sincronizado con su coreografía (y al repetirla).
  }, [state, ready, offsetMs, sound]);

  // Pitidos 3-2-1 durante la entrada de la pregunta.
  useEffect(() => {
    const q = state.question;
    if (!ready || state.status !== "question" || !q) return;
    const id = setInterval(() => {
      const left = q.startedAt - (Date.now() + offsetMs);
      const second = Math.ceil(left / 1000);
      const key = `${q.position}:${second}`;
      if (left > 0 && second <= 3 && q.pausedRemainingMs === null && beeped.current !== key) {
        beeped.current = key;
        sound.countdownBeep(second);
      }
    }, 100);
    return () => clearInterval(id);
  }, [state.status, state.question, offsetMs, ready, sound]);

  // Al salir de la pantalla, silencio.
  useEffect(() => () => sound.stopMusic(), [sound]);
}
