"use client";

import { LIMITS, QUESTION_TYPES, TIME_LIMITS, type DraftErrors, type DraftQuestion } from "@/lib/live-validation";
import { colors, calSans } from "@/lib/theme";
import { card } from "@/lib/styles";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CopyIcon, TrashIcon } from "@/components/icons";
import AnswerShape, { ANSWER_STYLES } from "@/components/live/AnswerShape";
import { Field, input } from "./EditorField";

interface Props {
  index: number;
  total: number;
  question: DraftQuestion;
  errors: DraftErrors;
  readOnly: boolean;
  onChange: (next: DraftQuestion) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const HINTS: Record<DraftQuestion["type"], string> = {
  quiz: "Marca una o varias respuestas correctas. Suma puntos por acertar y por rapidez.",
  vf: "Marca cuál es la respuesta correcta.",
  encuesta: "Sin respuesta correcta y sin puntos: se muestra cómo votó el grupo.",
  nube: "Cada jugador escribe una palabra o frase corta y se arma una nube en el proyector. No suma puntos.",
};

export default function QuestionCard({
  index,
  total,
  question: q,
  errors,
  readOnly,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: Props) {
  const e = (key: string) => errors[`q.${index}.${key}`];
  const typeLabel = QUESTION_TYPES.find((t) => t.type === q.type)?.label ?? q.type;
  const id = `q${index}`;
  const editableOptions = q.type === "quiz" || q.type === "encuesta";

  function setOption(oi: number, patch: Partial<DraftQuestion["options"][number]>) {
    onChange({ ...q, options: q.options.map((o, i) => (i === oi ? { ...o, ...patch } : o)) });
  }

  function toggleCorrect(oi: number) {
    // V/F: exactamente una correcta. Quiz: se pueden marcar varias.
    if (q.type === "vf") onChange({ ...q, options: q.options.map((o, i) => ({ ...o, correct: i === oi })) });
    else setOption(oi, { correct: !q.options[oi].correct });
  }

  return (
    <section aria-labelledby={`${id}-title`} style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              ...calSans,
              width: 30,
              height: 30,
              borderRadius: 9,
              background: colors.accentTint,
              color: colors.accentDark,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            {index + 1}
          </span>
          <h3 id={`${id}-title`} style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.inkSoft, letterSpacing: 0.4, textTransform: "uppercase" }}>
            {typeLabel}
          </h3>
        </div>
        {!readOnly && (
          <div style={{ display: "flex", gap: 6 }}>
            <IconButton label="Subir pregunta" disabled={index === 0} onClick={() => onMove(-1)}>
              <ArrowUpIcon />
            </IconButton>
            <IconButton label="Bajar pregunta" disabled={index === total - 1} onClick={() => onMove(1)}>
              <ArrowDownIcon />
            </IconButton>
            <IconButton label="Duplicar pregunta" disabled={total >= LIMITS.questions} onClick={onDuplicate}>
              <CopyIcon />
            </IconButton>
            <IconButton label="Eliminar pregunta" danger onClick={onRemove}>
              <TrashIcon />
            </IconButton>
          </div>
        )}
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 130px", gap: 12, alignItems: "start" }}>
        <Field label="Pregunta" htmlFor={`${id}-prompt`} error={e("prompt")}>
          <textarea
            id={`${id}-prompt`}
            value={q.prompt}
            onChange={(ev) => onChange({ ...q, prompt: ev.target.value })}
            maxLength={LIMITS.prompt}
            disabled={readOnly}
            rows={2}
            placeholder="Escribe la pregunta"
            style={{ ...input, height: "auto", padding: "10px 12px", resize: "vertical", lineHeight: 1.45, fontSize: 15 }}
          />
        </Field>
        <Field label="Tiempo" htmlFor={`${id}-time`} error={e("timeLimit")}>
          <select
            id={`${id}-time`}
            value={q.timeLimit}
            onChange={(ev) => onChange({ ...q, timeLimit: Number(ev.target.value) })}
            disabled={readOnly}
            style={input}
          >
            {TIME_LIMITS.map((t) => (
              <option key={t} value={t}>
                {t % 60 === 0 ? `${t / 60} min` : `${t} s`}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p style={{ margin: 0, fontSize: 12.5, color: colors.muted, lineHeight: 1.5 }}>{HINTS[q.type]}</p>

      {q.options.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 10 }}>
          {q.options.map((o, oi) => {
            const style = ANSWER_STYLES[oi];
            const err = e(`o.${oi}`);
            const canMarkCorrect = q.type === "quiz" || q.type === "vf";
            return (
              <div key={oi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: 6,
                    borderRadius: 12,
                    // La correcta se distingue por el tinte de marca y el check; nunca solo por color.
                    background: o.correct && canMarkCorrect ? colors.accentTint : "#F7FAFB",
                    border: `1.5px solid ${err ? colors.danger : o.correct && canMarkCorrect ? colors.accentLight : "transparent"}`,
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: style.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AnswerShape index={oi} />
                  </span>
                  <input
                    aria-label={`Opción ${oi + 1} (${style.name})`}
                    value={o.text}
                    onChange={(ev) => setOption(oi, { text: ev.target.value })}
                    maxLength={LIMITS.option}
                    disabled={readOnly || !editableOptions}
                    placeholder={`Opción ${oi + 1}`}
                    style={{ ...input, height: 36, border: "none", background: "transparent", padding: "0 4px" }}
                  />
                  {canMarkCorrect && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={o.correct}
                      aria-label={`Marcar opción ${oi + 1} como correcta`}
                      title={o.correct ? "Respuesta correcta" : "Marcar como correcta"}
                      disabled={readOnly}
                      onClick={() => toggleCorrect(oi)}
                      className="btn-icon"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        flexShrink: 0,
                        cursor: readOnly ? "default" : "pointer",
                        border: `1.5px solid ${o.correct ? colors.accent : colors.border}`,
                        background: o.correct ? colors.accent : "#fff",
                        color: o.correct ? "#fff" : colors.mutedLight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckIcon />
                    </button>
                  )}
                  {editableOptions && !readOnly && q.options.length > LIMITS.minOptions && (
                    <IconButton
                      label={`Quitar opción ${oi + 1}`}
                      onClick={() => onChange({ ...q, options: q.options.filter((_, i) => i !== oi) })}
                    >
                      <TrashIcon />
                    </IconButton>
                  )}
                </div>
                {err && <span style={{ fontSize: 12, color: colors.danger, paddingLeft: 6 }}>{err}</span>}
              </div>
            );
          })}
        </div>
      )}

      {e("options") && (
        <span role="alert" style={{ fontSize: 12.5, color: colors.danger }}>
          {e("options")}
        </span>
      )}

      {editableOptions && !readOnly && q.options.length < LIMITS.maxOptions && (
        <button
          type="button"
          className="btn-text"
          onClick={() => onChange({ ...q, options: [...q.options, { text: "", correct: false }] })}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            color: colors.accent,
          }}
        >
          ＋ Agregar opción
        </button>
      )}
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="btn-icon"
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: "#fff",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        color: danger ? colors.danger : colors.muted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
