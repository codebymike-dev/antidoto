"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChallengeSnapshot } from "@/lib/live-protocol";
import { encouragement, finalHeadline } from "@/lib/live-player-view";
import { remainingMs } from "@/lib/live-client-state";
import { formatDateTime } from "@/lib/live-report-format";
import AnswerShape, { ANSWER_STYLES } from "../AnswerShape";
import AnswerTile from "../AnswerTile";
import CountdownRing from "../CountdownRing";
import { useServerNow } from "../useServerNow";
import { clockOffset } from "../useLiveChannel";
import { calSans, game, liveButton, liveGhostButton } from "../game-theme";

// Desafío a su ritmo: sin Ably ni proyector. Cada paso es un POST y luego se pide la
// foto de nuevo; la pregunta y las opciones se leen completas en el celular.

interface Props {
  initial: ChallengeSnapshot;
  onLeave: () => void;
}

const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // iOS no lo soporta: se ignora.
  }
};

/** closesAt viene en epoch ms; formatDateTime espera el formato de SQLite en UTC. */
const closesText = (ms: number) => formatDateTime(new Date(ms).toISOString().slice(0, 19).replace("T", " "));

export default function ChallengeGame({ initial, onLeave }: Props) {
  const [state, setState] = useState(initial);
  const [offset, setOffset] = useState(() => clockOffset(initial.serverNow));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/live/me", { cache: "no-store" });
    if (res.status === 401) return onLeave();
    if (!res.ok) return;
    const snapshot: ChallengeSnapshot = await res.json();
    setState(snapshot);
    setOffset(clockOffset(snapshot.serverNow));
  }, [onLeave]);

  async function post(url: string, body: object) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "No se pudo enviar.");
      // Con éxito o sin él, la foto dice dónde quedó el jugador.
      await refresh();
    } catch {
      setError("Sin conexión. Vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  const next = () => post("/api/live/challenge/next", {});
  const answer = (body: { optionIndex: number } | { text: string }) => {
    vibrate(40);
    return post("/api/live/answer", { position: state.question?.position, ...body });
  };

  // Vibración al conocer el resultado, una vez por pregunta.
  const vibratedFor = useRef<number | null>(null);
  useEffect(() => {
    if (state.phase !== "feedback" || !state.feedback || vibratedFor.current === state.question?.position) return;
    vibratedFor.current = state.question?.position ?? null;
    if (state.feedback.isCorrect === true) vibrate([60, 40, 60]);
    else if (state.feedback.isCorrect === false || !state.myAnswer) vibrate(250);
  }, [state.phase, state.feedback, state.question?.position, state.myAnswer]);

  if (state.kicked) {
    return (
      <Screen>
        <Centered>
          <h1 style={title}>Te sacaron de este desafío</h1>
          <button type="button" className="btn-live" style={{ ...liveButton, marginTop: 24 }} onClick={onLeave}>
            Volver al inicio
          </button>
        </Centered>
      </Screen>
    );
  }

  const q = state.question;

  return (
    <>
      <header style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${game.border}` }}>
        <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.nickname}</span>
        {q && (
          <span style={{ color: game.muted, fontSize: 13, fontWeight: 600 }}>
            {q.position} de {state.totalQuestions}
          </span>
        )}
        <span style={{ ...calSans, padding: "4px 12px", borderRadius: 999, background: game.surfaceStrong, fontSize: 16 }}>{state.score}</span>
      </header>

      {error && (
        <div role="alert" style={toast}>
          {error}
        </div>
      )}

      <main style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 16 }}>
        {state.phase === "intro" && (
          <Centered>
            <span style={{ fontSize: 13, fontWeight: 700, color: game.accent, letterSpacing: 1 }}>DESAFÍO A TU RITMO</span>
            <h1 className="live-pop" style={title}>{state.gameTitle}</h1>
            <p style={subtitle}>
              {state.totalQuestions} preguntas · cierra el {closesText(state.closesAt)}
            </p>
            <p style={{ ...subtitle, maxWidth: 340, fontSize: 15, lineHeight: 1.5 }}>
              Cada pregunta tiene su propio tiempo. Mientras más rápido aciertes, más puntos. Tienes un solo intento.
            </p>
            <button type="button" className="btn-live" style={{ ...liveButton, height: 56, fontSize: 18, padding: "0 40px", marginTop: 16 }} onClick={next} disabled={busy}>
              {busy ? "Un momento…" : "¡Empezar!"}
            </button>
          </Centered>
        )}

        {state.phase === "question" && q && (
          <QuestionView key={q.position} state={state} offset={offset} busy={busy} onAnswer={answer} onTimeUp={refresh} />
        )}

        {state.phase === "feedback" && q && state.feedback && (
          <FeedbackView state={state} busy={busy} onNext={next} />
        )}

        {state.phase === "finished" && <FinishedView state={state} onLeave={onLeave} />}
      </main>
    </>
  );
}

function QuestionView({
  state,
  offset,
  busy,
  onAnswer,
  onTimeUp,
}: {
  state: ChallengeSnapshot;
  offset: number;
  busy: boolean;
  onAnswer: (body: { optionIndex: number } | { text: string }) => void;
  onTimeUp: () => Promise<void>;
}) {
  const q = state.question!;
  const [word, setWord] = useState("");
  const serverNow = useServerNow(offset, 250);
  const introLeft = serverNow === null ? null : q.startedAt - serverNow;
  const timeUp = serverNow !== null && remainingMs(q, offset, serverNow - offset) === 0;

  // Al vencer el tiempo, el servidor (con su margen) pasa la pregunta a resultado. Se
  // pregunta hasta que lo haga: los relojes nunca coinciden al milisegundo.
  useEffect(() => {
    if (!timeUp) return;
    const id = setInterval(() => void onTimeUp(), 1200);
    return () => clearInterval(id);
  }, [timeUp, onTimeUp]);

  if (introLeft === null || introLeft > 0) {
    return (
      <Centered>
        <p style={subtitle}>
          Pregunta {q.position} de {q.total}
        </p>
        <h1 className="live-pop" style={title}>¡Prepárate!</h1>
        <span aria-live="polite" style={{ ...calSans, fontSize: 72, color: game.accent }}>
          {introLeft === null ? "" : Math.ceil(introLeft / 1000)}
        </span>
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
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <CountdownRing question={q} offsetMs={offset} size={64} />
        <p style={{ margin: 0, fontWeight: 700, fontSize: 19, lineHeight: 1.35, flex: 1 }}>{q.prompt}</p>
      </div>

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
          <button type="submit" disabled={busy || !word.trim()} className="btn-live" style={{ ...liveButton, height: 56, fontSize: 18, opacity: busy || !word.trim() ? 0.6 : 1 }}>
            Enviar
          </button>
        </form>
      ) : (
        <div style={{ flex: 1, display: "grid", gridAutoRows: "1fr", gap: 12 }}>
          {q.options.map((text, i) => (
            <button
              key={i}
              type="button"
              className="btn-live"
              disabled={busy}
              onClick={() => onAnswer({ optionIndex: i })}
              aria-label={`Opción ${i + 1}: ${text}`}
              style={{
                border: "none",
                borderRadius: 18,
                background: ANSWER_STYLES[i].bg,
                color: ANSWER_STYLES[i].fg,
                display: "flex",
                alignItems: "center",
                gap: 14,
                cursor: "pointer",
                boxShadow: "0 6px 0 rgba(0,0,0,0.3)",
                touchAction: "manipulation",
                padding: "12px 18px",
                minHeight: 72,
                textAlign: "left",
              }}
            >
              <AnswerShape index={i} size={32} />
              <span style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.25 }}>{text}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function FeedbackView({ state, busy, onNext }: { state: ChallengeSnapshot; busy: boolean; onNext: () => void }) {
  const q = state.question!;
  const fb = state.feedback!;
  const scoredQ = q.type === "quiz" || q.type === "vf";
  const outcome = !state.myAnswer ? "noAnswer" : !scoredQ ? "participated" : fb.isCorrect ? "correct" : "incorrect";
  const look = {
    correct: { bg: ANSWER_STYLES[3].bg, title: "¡Correcto!" },
    incorrect: { bg: ANSWER_STYLES[0].bg, title: "Incorrecto" },
    noAnswer: { bg: game.surfaceStrong, title: "Se acabó el tiempo" },
    participated: { bg: ANSWER_STYLES[1].bg, title: "¡Gracias por participar!" },
  }[outcome];
  const last = q.position >= state.totalQuestions;

  return (
    <>
      <div
        className={outcome === "incorrect" ? "live-shake" : "live-pop"}
        style={{ borderRadius: 24, background: look.bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 20px", textAlign: "center" }}
      >
        <h1 style={{ ...title, fontSize: 36 }}>{look.title}</h1>
        {outcome === "correct" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {fb.streak >= 2 && <span style={pill("#E8A33D", game.bg)}>Racha de {fb.streak}</span>}
            <span style={pill("rgba(0,0,0,0.25)", "#fff")}>+{fb.points}</span>
          </div>
        )}
        {outcome === "incorrect" && <p style={{ ...subtitle, color: "#fff" }}>{encouragement(`${state.nickname}:${q.position}`)}</p>}
      </div>

      {scoredQ && fb.correct.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ color: game.muted, fontSize: 13, fontWeight: 600 }}>{fb.correct.length > 1 ? "Respuestas correctas" : "Respuesta correcta"}</span>
          {fb.correct.map((i) => (
            <AnswerTile key={i} index={i} text={q.options[i]} state="correct" />
          ))}
        </div>
      )}

      <button type="button" className="btn-live" style={{ ...liveButton, height: 56, fontSize: 18, marginTop: "auto" }} onClick={onNext} disabled={busy}>
        {busy ? "Un momento…" : last ? "Ver mi resultado" : "Siguiente pregunta"}
      </button>
    </>
  );
}

function FinishedView({ state, onLeave }: { state: ChallengeSnapshot; onLeave: () => void }) {
  const r = state.result;
  const unfinished = r !== null && r.answered < state.totalQuestions;

  if (!r || (state.closed && r.answered === 0)) {
    return (
      <Centered>
        <h1 style={title}>Este desafío ya cerró</h1>
        <p style={subtitle}>Cerró el {closesText(state.closesAt)}.</p>
        <button type="button" className="btn-live" style={{ ...liveGhostButton, marginTop: 24 }} onClick={onLeave}>
          Salir
        </button>
      </Centered>
    );
  }

  return (
    <Centered>
      {r.rank <= 3 && (
        <span aria-hidden className="live-pop" style={{ fontSize: 64 }}>
          {["🥇", "🥈", "🥉"][r.rank - 1]}
        </span>
      )}
      <h1 className="live-pop" style={title}>{finalHeadline(r.rank, `${state.nickname}:${state.matchId}`)}</h1>
      <span style={{ ...calSans, fontSize: 44 }}>{state.score} puntos</span>
      <p style={{ ...subtitle, color: game.text, fontWeight: 600 }}>
        {r.correct} de {state.totalQuestions} correctas · vas en el {r.rank}º lugar de {r.players}
      </p>
      {unfinished && <p style={subtitle}>El desafío cerró antes de que terminaras: cuenta lo que alcanzaste a responder.</p>}
      {!state.closed && <p style={{ ...subtitle, fontSize: 14 }}>El ranking sigue cambiando hasta el {closesText(state.closesAt)}.</p>}

      <ol style={{ listStyle: "none", margin: "16px 0 0", padding: 0, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 8 }}>
        {r.top.map((e) => (
          <li
            key={e.nickname}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 14,
              background: e.nickname === state.nickname ? "rgba(59,200,243,0.22)" : game.surface,
              fontWeight: 600,
            }}
          >
            <span style={{ ...calSans, width: 28, textAlign: "left" }}>{e.rank}º</span>
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nickname}</span>
            <span style={calSans}>{e.score}</span>
          </li>
        ))}
      </ol>

      <button type="button" className="btn-live" style={{ ...liveGhostButton, marginTop: 24 }} onClick={onLeave}>
        Salir
      </button>
    </Centered>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <main style={{ position: "relative", flex: 1, display: "flex", padding: 16 }}>{children}</main>;
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
  fontSize: 22,
});

const toast: React.CSSProperties = {
  position: "relative",
  margin: "8px 16px 0",
  padding: "10px 14px",
  borderRadius: 12,
  background: game.danger,
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  textAlign: "center",
};
