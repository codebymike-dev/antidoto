"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyPublicEvent, remainingMs } from "@/lib/live-client-state";
import { useServerNow } from "../useServerNow";
import type { PlayerSnapshot } from "@/lib/live-protocol";
import { encouragement, finalHeadline, outcomeOf, standingLine, standingOf } from "@/lib/live-player-view";
import AnswerShape, { ANSWER_STYLES } from "../AnswerShape";
import CountdownRing from "../CountdownRing";
import { clockOffset, useLiveChannel } from "../useLiveChannel";
import { calSans, game, liveButton, liveGhostButton } from "../game-theme";

interface Props {
  initial: PlayerSnapshot;
  onLeave: () => void;
}

const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // iOS no lo soporta: se ignora.
  }
};

export default function PlayerGame({ initial, onLeave }: Props) {
  const [state, setState] = useState(initial);
  const [offset, setOffset] = useState(() => clockOffset(initial.serverNow));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resync = useCallback(async () => {
    const res = await fetch("/api/live/me", { cache: "no-store" });
    if (res.status === 401) return onLeave();
    if (!res.ok) return;
    const snapshot: PlayerSnapshot = await res.json();
    setState(snapshot);
    setOffset(clockOffset(snapshot.serverNow));
  }, [onLeave]);

  if (state.kicked) return <Kicked onLeave={onLeave} />;

  return (
    <Connected
      state={state}
      setState={setState}
      offset={offset}
      setOffset={setOffset}
      resync={resync}
      sending={sending}
      setSending={setSending}
      error={error}
      setError={setError}
      onLeave={onLeave}
    />
  );
}

// El canal vive en un componente aparte: al expulsar al jugador se desmonta y se cierra.
function Connected({
  state,
  setState,
  offset,
  setOffset,
  resync,
  sending,
  setSending,
  error,
  setError,
  onLeave,
}: {
  state: PlayerSnapshot;
  setState: React.Dispatch<React.SetStateAction<PlayerSnapshot>>;
  offset: number;
  setOffset: (n: number) => void;
  resync: () => Promise<void>;
  sending: boolean;
  setSending: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  onLeave: () => void;
}) {
  const { connection } = useLiveChannel({
    matchId: state.matchId,
    role: "player",
    onPublic: (event) => {
      setState((s) => applyPublicEvent(s, event));
      if ("serverNow" in event.data) setOffset(clockOffset(event.data.serverNow));
    },
    onResync: () => void resync(),
  });

  // Vibración al conocer el resultado, una sola vez por pregunta.
  const outcome = outcomeOf(state);
  const vibratedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!outcome || vibratedFor.current === state.reveal?.position) return;
    vibratedFor.current = state.reveal?.position ?? null;
    if (outcome === "correct") vibrate([60, 40, 60]);
    else if (outcome === "incorrect") vibrate(250);
  }, [outcome, state.reveal?.position]);

  async function answer(body: { optionIndex: number } | { text: string }) {
    const q = state.question;
    if (!q || sending) return;
    vibrate(40);
    setSending(true);
    setError(null);
    // Se muestra la elección al instante (el servidor puede tardar unos cientos de ms) y
    // se deshace si la rechaza. Solo si sigue siendo la misma pregunta.
    const samePosition = (s: PlayerSnapshot) => s.question?.position === q.position;
    setState((s) =>
      samePosition(s)
        ? { ...s, myAnswer: "optionIndex" in body ? { optionIndex: body.optionIndex, text: null } : { optionIndex: null, text: body.text } }
        : s
    );
    const undo = () => setState((s) => (samePosition(s) ? { ...s, myAnswer: null } : s));
    try {
      const res = await fetch("/api/live/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ position: q.position, ...body }),
      });
      if (!res.ok) {
        undo();
        setError((await res.json().catch(() => null))?.error ?? "No se pudo enviar.");
        // Puede que ya hubiera respondido o que la pregunta cerrara: la foto lo aclara.
        await resync();
      }
    } catch {
      undo();
      setError("Sin conexión. Vuelve a intentarlo.");
    } finally {
      setSending(false);
    }
  }

  const me = standingOf(state.entries, state.nickname);
  const q = state.question;

  return (
    <>
      <header style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${game.border}` }}>
        <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.nickname}</span>
        {q && state.status !== "finished" && (
          <span style={{ color: game.muted, fontSize: 13, fontWeight: 600 }}>
            {q.position} de {q.total}
          </span>
        )}
        <span style={{ ...calSans, padding: "4px 12px", borderRadius: 999, background: game.surfaceStrong, fontSize: 16 }}>
          {me?.score ?? 0}
        </span>
      </header>

      {(connection === "disconnected" || connection === "suspended") && (
        <div role="status" style={toast("#E8A33D", game.bg)}>
          Reconectando…
        </div>
      )}
      {error && (
        <div role="alert" style={toast(game.danger, "#fff")}>
          {error}
        </div>
      )}

      <main style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 16 }}>
        {state.status === "lobby" && (
          <Centered>
            <h1 className="live-pop" style={title}>¡Estás dentro!</h1>
            <p style={subtitle}>¿Ves tu apodo en la pantalla?</p>
            <button type="button" className="btn-live" style={{ ...liveGhostButton, marginTop: 24 }} onClick={onLeave}>
              Salir
            </button>
          </Centered>
        )}

        {state.status === "question" && q && (
          <QuestionView state={state} offset={offset} sending={sending} onAnswer={answer} />
        )}

        {state.status === "reveal" && outcome && <ResultView state={state} outcome={outcome} />}

        {state.status === "leaderboard" && (
          <Centered>
            <p style={subtitle}>Mira el ranking en la pantalla</p>
            {me && (
              <>
                <span style={{ ...calSans, fontSize: 64 }}>{me.rank}º</span>
                <p style={{ ...subtitle, color: game.text, fontWeight: 600 }}>{standingLine(me)}</p>
              </>
            )}
          </Centered>
        )}

        {state.status === "finished" && (
          <Centered>
            {me ? (
              <>
                {me.rank <= 3 && (
                  <span aria-hidden className="live-pop" style={{ fontSize: 72 }}>
                    {["🥇", "🥈", "🥉"][me.rank - 1]}
                  </span>
                )}
                <h1 className="live-pop" style={title}>{finalHeadline(me.rank, `${state.nickname}:${state.matchId}`)}</h1>
                {me.rank <= 5 && <p style={{ ...subtitle, color: game.text, fontWeight: 600 }}>Terminaste en el {me.rank}º lugar</p>}
                <span style={{ ...calSans, fontSize: 40 }}>{me.score} puntos</span>
              </>
            ) : (
              <h1 style={title}>La partida terminó</h1>
            )}
            <button type="button" className="btn-live" style={{ ...liveButton, marginTop: 24 }} onClick={onLeave}>
              Jugar otra partida
            </button>
          </Centered>
        )}
      </main>
    </>
  );
}

function QuestionView({
  state,
  offset,
  sending,
  onAnswer,
}: {
  state: PlayerSnapshot;
  offset: number;
  sending: boolean;
  onAnswer: (body: { optionIndex: number } | { text: string }) => void;
}) {
  const q = state.question!;
  const [word, setWord] = useState("");
  const [showOptionText, setShowOptionText] = useState(false);
  const serverNow = useServerNow(offset, 250);
  const timeUp = serverNow !== null && remainingMs(q, offset, serverNow - offset) === 0;
  const introLeft = serverNow === null ? null : q.startedAt - serverNow;

  if (q.pausedRemainingMs !== null) {
    return (
      <Centered>
        <h1 style={title}>En pausa</h1>
        <p style={subtitle}>El host pausó la pregunta.</p>
      </Centered>
    );
  }

  if (introLeft === null || introLeft > 0) {
    return (
      <Centered>
        <p style={subtitle}>
          Pregunta {q.position} de {q.total}
        </p>
        <h1 className="live-rise" style={{ ...title, fontSize: 28 }}>{q.prompt}</h1>
        <span aria-live="polite" style={{ ...calSans, fontSize: 72, color: game.accent }}>
          {introLeft === null ? "" : Math.ceil(introLeft / 1000)}
        </span>
      </Centered>
    );
  }

  if (state.myAnswer) {
    const i = state.myAnswer.optionIndex;
    return (
      <Centered>
        {i !== null && (
          <span className="live-pop" style={{ background: ANSWER_STYLES[i].bg, borderRadius: 20, padding: 20, display: "flex" }}>
            <AnswerShape index={i} size={64} />
          </span>
        )}
        {state.myAnswer.text && <span style={{ ...calSans, fontSize: 32 }}>“{state.myAnswer.text}”</span>}
        <h1 style={title}>{sending ? "Enviando…" : "Respuesta enviada"}</h1>
        <p style={subtitle}>{sending ? "Un momento" : "Esperando a los demás…"}</p>
      </Centered>
    );
  }

  if (timeUp) {
    return (
      <Centered>
        <h1 style={title}>Se acabó el tiempo</h1>
      </Centered>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <CountdownRing question={q} offsetMs={offset} size={64} />
        <button
          type="button"
          onClick={() => setShowOptionText((v) => !v)}
          aria-pressed={showOptionText}
          style={{ background: "none", border: "none", color: game.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
        >
          {showOptionText ? "Ocultar las respuestas" : "Ver las respuestas aquí"}
        </button>
      </div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: 18, lineHeight: 1.35 }}>{q.prompt}</p>

      {q.type === "nube" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (word.trim()) onAnswer({ text: word });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto", marginBottom: "auto" }}
        >
          <label htmlFor="word" style={{ ...calSans, fontSize: 24, textAlign: "center" }}>
            Escribe una palabra
          </label>
          <input
            id="word"
            autoFocus
            maxLength={30}
            value={word}
            onChange={(e) => setWord(e.target.value)}
            style={{ height: 60, borderRadius: 14, border: "none", padding: "0 16px", fontSize: 22, fontWeight: 600, textAlign: "center", color: game.bg }}
          />
          <button type="submit" disabled={sending || !word.trim()} className="btn-live" style={{ ...liveButton, height: 56, fontSize: 18, opacity: sending || !word.trim() ? 0.6 : 1 }}>
            Enviar
          </button>
        </form>
      ) : (
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: q.options.length > 2 ? "1fr 1fr" : "1fr",
            gridAutoRows: "1fr",
            gap: 12,
          }}
        >
          {q.options.map((text, i) => (
            <button
              key={i}
              type="button"
              className="btn-live"
              disabled={sending}
              onClick={() => onAnswer({ optionIndex: i })}
              aria-label={`Opción ${i + 1}, ${ANSWER_STYLES[i].name}: ${text}`}
              style={{
                border: "none",
                borderRadius: 18,
                background: ANSWER_STYLES[i].bg,
                color: ANSWER_STYLES[i].fg,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                boxShadow: "0 6px 0 rgba(0,0,0,0.3)",
                touchAction: "manipulation",
                padding: 12,
                minHeight: 110,
              }}
            >
              <AnswerShape index={i} size={56} />
              {showOptionText && <span style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>{text}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ResultView({ state, outcome }: { state: PlayerSnapshot; outcome: NonNullable<ReturnType<typeof outcomeOf>> }) {
  const me = standingOf(state.entries, state.nickname);
  const seed = `${state.nickname}:${state.reveal?.position}`;
  const look = {
    correct: { bg: ANSWER_STYLES[3].bg, title: "¡Correcto!" },
    incorrect: { bg: ANSWER_STYLES[0].bg, title: "Incorrecto" },
    noAnswer: { bg: game.surfaceStrong, title: "Se acabó el tiempo" },
    participated: { bg: ANSWER_STYLES[1].bg, title: "¡Gracias por participar!" },
  }[outcome];

  return (
    <div
      className={outcome === "incorrect" ? "live-shake" : "live-pop"}
      style={{ flex: 1, borderRadius: 24, background: look.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}
    >
      <h1 style={{ ...title, fontSize: 40 }}>{look.title}</h1>
      {outcome === "correct" && me && (
        <>
          {me.streak >= 2 && <span style={pill("#E8A33D", game.bg)}>Racha de {me.streak}</span>}
          <span style={pill("rgba(0,0,0,0.25)", "#fff")}>+{me.lastPoints}</span>
        </>
      )}
      {outcome === "incorrect" && <p style={{ ...subtitle, color: "#fff" }}>{encouragement(seed)}</p>}
      {me && (outcome === "correct" || outcome === "incorrect" || outcome === "noAnswer") && (
        <p style={{ margin: 0, fontWeight: 600, fontSize: 17, marginTop: 12 }}>{standingLine(me)}</p>
      )}
    </div>
  );
}

function Kicked({ onLeave }: { onLeave: () => void }) {
  return (
    <main style={{ position: "relative", flex: 1, display: "flex", padding: 16 }}>
      <Centered>
        <h1 style={title}>El host te sacó de la partida</h1>
        <button type="button" className="btn-live" style={{ ...liveButton, marginTop: 24 }} onClick={onLeave}>
          Volver al inicio
        </button>
      </Centered>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center" }}>
      {children}
    </div>
  );
}

const title: React.CSSProperties = { ...calSans, margin: 0, fontSize: 34, fontWeight: 400, lineHeight: 1.15 };
const subtitle: React.CSSProperties = { margin: 0, color: game.muted, fontSize: 17 };

const pill = (bg: string, fg: string): React.CSSProperties => ({
  ...calSans,
  padding: "8px 20px",
  borderRadius: 999,
  background: bg,
  color: fg,
  fontSize: 24,
});

const toast = (bg: string, fg: string): React.CSSProperties => ({
  position: "relative",
  margin: "8px 16px 0",
  padding: "10px 14px",
  borderRadius: 12,
  background: bg,
  color: fg,
  fontWeight: 600,
  fontSize: 14,
  textAlign: "center",
});
