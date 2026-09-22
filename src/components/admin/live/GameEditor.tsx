"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { duplicateGame, saveGame } from "@/lib/live-games-actions";
import {
  LIMITS,
  QUESTION_TYPES,
  newQuestion,
  parseGameDraft,
  type DraftErrors,
  type DraftQuestion,
  type GameDraft,
} from "@/lib/live-validation";
import type { LiveQuestionType } from "@/lib/types";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, secondaryButton } from "@/lib/styles";
import { Field, input } from "./EditorField";
import QuestionCard from "./QuestionCard";

export type EditorQuestion = DraftQuestion & { key: string };

interface Props {
  gameId: number;
  archived: boolean;
  /** Si no es null, el editor queda en solo lectura y se explica por qué. */
  readOnlyReason: string | null;
  companies: { id: number; name: string }[];
  canChooseCompany: boolean;
  initial: GameDraft;
}

let keySeq = 0;
const withKey = (q: DraftQuestion): EditorQuestion => ({ ...q, key: `q${++keySeq}` });
// Mismo orden de campos que el borrador del servidor: el snapshot se compara como JSON.
const toDraft = ({ type, prompt, timeLimit, options }: EditorQuestion): DraftQuestion => ({ type, prompt, timeLimit, options });

export default function GameEditor({ gameId, archived, readOnlyReason, companies, canChooseCompany, initial }: Props) {
  const readOnly = readOnlyReason !== null;
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [companyId, setCompanyId] = useState<number | null>(initial.companyId);
  const [questions, setQuestions] = useState<EditorQuestion[]>(() => initial.questions.map(withKey));

  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial));
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<DraftErrors>({});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const draft: GameDraft = useMemo(
    () => ({ title, description, companyId, questions: questions.map(toDraft) }),
    [title, description, companyId, questions]
  );
  const dirty = JSON.stringify(draft) !== savedSnapshot;

  // Tras el primer intento fallido, los errores se recalculan en vivo mientras se corrige.
  const localErrors = useMemo(() => {
    const res = parseGameDraft(draft);
    return res.ok ? {} : res.errors;
  }, [draft]);
  const errors: DraftErrors = showErrors ? { ...serverErrors, ...localErrors } : {};

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save() {
    setMessage(null);
    if (Object.keys(localErrors).length > 0) {
      setShowErrors(true);
      setMessage({ kind: "error", text: "Revisa los campos marcados." });
      return;
    }
    startSaving(async () => {
      const res = await saveGame(gameId, draft);
      if (res.ok) {
        setSavedSnapshot(JSON.stringify(draft));
        setServerErrors({});
        setShowErrors(false);
        setMessage({ kind: "ok", text: "Cambios guardados." });
      } else {
        setServerErrors(res.errors);
        setShowErrors(true);
        setMessage({ kind: "error", text: res.message ?? "No se pudo guardar." });
      }
    });
  }

  function updateQuestion(index: number, next: DraftQuestion) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...next, key: q.key } : q)));
  }

  function addQuestion(type: LiveQuestionType) {
    setQuestions((qs) => [...qs, withKey(newQuestion(type))]);
  }

  function move(index: number, delta: number) {
    setQuestions((qs) => {
      const target = index + delta;
      if (target < 0 || target >= qs.length) return qs;
      const next = [...qs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function duplicateQuestion(index: number) {
    setQuestions((qs) => {
      const copy = withKey(structuredClone({ ...qs[index], key: "" }));
      return [...qs.slice(0, index + 1), copy, ...qs.slice(index + 1)];
    });
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  const totalSeconds = questions.reduce((s, q) => s + q.timeLimit, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 860 }}>
      <Link href="/admin/juegos" style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
        ‹ Juegos en vivo
      </Link>

      {(readOnlyReason || archived) && (
        <div
          role="status"
          style={{
            ...card,
            padding: "14px 18px",
            background: colors.accentTint,
            boxShadow: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13.5, color: colors.accentDark, lineHeight: 1.5, flex: "1 1 320px" }}>
            {readOnlyReason ?? "Este juego está archivado. Puedes editarlo, pero no aparece en la lista de activos."}
          </span>
          {readOnlyReason && (
            <form action={duplicateGame}>
              <input type="hidden" name="id" value={gameId} />
              <button type="submit" className="btn-filled" style={filledButton}>
                Duplicar para editar
              </button>
            </form>
          )}
        </div>
      )}

      {/* Barra de guardado: queda fija arriba mientras se edita un juego largo. */}
      {!readOnly && (
        <div
          style={{
            position: "sticky",
            top: 12,
            zIndex: 5,
            ...card,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, color: colors.muted }}>
            {questions.length === 1 ? "1 pregunta" : `${questions.length} preguntas`} · ~{formatDuration(totalSeconds)} de
            juego
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {message && (
              <span
                role={message.kind === "error" ? "alert" : "status"}
                style={{ fontSize: 13, fontWeight: 600, color: message.kind === "error" ? colors.danger : colors.accentDark }}
              >
                {message.text}
              </span>
            )}
            {!message && dirty && <span style={{ fontSize: 13, color: colors.muted }}>Cambios sin guardar</span>}
            <button
              type="button"
              className="btn-filled"
              style={{ ...filledButton, opacity: !dirty || saving ? 0.6 : 1 }}
              disabled={!dirty || saving}
              onClick={save}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      <section style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nombre del juego" htmlFor="title" error={errors.title}>
          <input
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setMessage(null);
            }}
            maxLength={LIMITS.title}
            disabled={readOnly}
            placeholder="Ej. Pausa activa de los viernes"
            style={{ ...input, ...calSans, fontSize: 20, height: 52 }}
          />
        </Field>
        <Field label="Descripción (opcional)" htmlFor="description" error={errors.description}>
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setMessage(null);
            }}
            maxLength={LIMITS.description}
            disabled={readOnly}
            rows={2}
            placeholder="Para qué sirve este juego o con qué equipo usarlo."
            style={{ ...input, height: "auto", padding: "10px 14px", resize: "vertical", lineHeight: 1.5 }}
          />
        </Field>
        {canChooseCompany && (
          <Field label="Disponible para" htmlFor="companyId" error={errors.companyId}>
            <select
              id="companyId"
              value={companyId ?? ""}
              onChange={(e) => {
                setCompanyId(e.target.value === "" ? null : Number(e.target.value));
                setMessage(null);
              }}
              disabled={readOnly}
              style={input}
            >
              <option value="">Todas las empresas (global)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  Solo {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </section>

      {errors.questions && <p style={{ color: colors.danger, fontSize: 13, margin: 0 }}>{errors.questions}</p>}

      {questions.map((q, i) => (
        <QuestionCard
          key={q.key}
          index={i}
          total={questions.length}
          question={q}
          errors={errors}
          readOnly={readOnly}
          onChange={(next) => {
            updateQuestion(i, next);
            setMessage(null);
          }}
          onMove={(delta) => move(i, delta)}
          onDuplicate={() => duplicateQuestion(i)}
          onRemove={() => removeQuestion(i)}
        />
      ))}

      {questions.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: colors.muted, fontSize: 14, padding: 28 }}>
          {readOnly ? "Este juego no tiene preguntas." : "Todavía no hay preguntas. Agrega la primera:"}
        </div>
      )}

      {!readOnly && questions.length < LIMITS.questions && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              className="btn-secondary"
              style={secondaryButton}
              onClick={() => addQuestion(t.type)}
            >
              ＋ {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.round(seconds / 60)} min`;
}
