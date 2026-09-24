"use client";

import { useActionState } from "react";
import { saveRiskTexts, resetRiskTexts, type SaveTextsState } from "@/lib/experience-actions";
import { LIMITS } from "@/lib/experiences/texts";
import type { RiskTexts } from "@/lib/experiences/types";
import { colors } from "@/lib/theme";
import { fieldLabel, filledButton } from "@/lib/styles";

const OPTION_KEYS = ["A", "B", "C"];

interface Props {
  experience: string;
  riskId: string;
  texts: RiskTexts;
  edited: boolean;
}

/** Formulario de un riesgo de la biblioteca: pregunta, 3 opciones, correcta, explicación. */
export default function RiskTextsEditor({ experience, riskId, texts, edited }: Props) {
  const [state, action, pending] = useActionState<SaveTextsState, FormData>(saveRiskTexts, null);
  const id = (name: string) => `${riskId}-${name}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="hidden" name="experience" value={experience} />
        <input type="hidden" name="risk" value={riskId} />
        <Labeled label="Título del riesgo" htmlFor={id("title")}>
          <input id={id("title")} name="title" defaultValue={texts.title} maxLength={LIMITS.title} required style={inputStyle} />
        </Labeled>
        <Labeled label="Pregunta" htmlFor={id("prompt")}>
          <input id={id("prompt")} name="prompt" defaultValue={texts.prompt} maxLength={LIMITS.prompt} required style={inputStyle} />
        </Labeled>
        <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <legend style={{ ...fieldLabel, marginBottom: 6 }}>Opciones (marca la correcta)</legend>
          {texts.options.map((o, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: colors.inkSoft, cursor: "pointer" }}>
                <input type="radio" name="correct" value={i} defaultChecked={texts.correct === i} required aria-label={`La opción ${OPTION_KEYS[i]} es la correcta`} />
                {OPTION_KEYS[i]}
              </label>
              <input
                name={`option${i}`}
                defaultValue={o}
                maxLength={LIMITS.option}
                required
                aria-label={`Opción ${OPTION_KEYS[i]}`}
                style={inputStyle}
              />
            </div>
          ))}
        </fieldset>
        <Labeled label="Explicación (se muestra al responder)" htmlFor={id("explanation")}>
          <textarea
            id={id("explanation")}
            name="explanation"
            defaultValue={texts.explanation}
            maxLength={LIMITS.explanation}
            required
            rows={3}
            style={{ ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", lineHeight: 1.45 }}
          />
        </Labeled>
        <Labeled label="Buena práctica (así sí)" htmlFor={id("practice")}>
          <textarea
            id={id("practice")}
            name="practice"
            defaultValue={texts.practice}
            maxLength={LIMITS.practice}
            required
            rows={2}
            style={{ ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", lineHeight: 1.45 }}
          />
        </Labeled>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" className="btn-filled" disabled={pending} style={{ ...filledButton, height: 38, fontSize: 13 }}>
            {pending ? "Guardando..." : "Guardar"}
          </button>
          {state && (
            <span role={state.ok ? "status" : "alert"} style={{ fontSize: 13, color: state.ok ? "#1F8A4C" : colors.danger, fontWeight: 600 }}>
              {state.message}
            </span>
          )}
        </div>
      </form>
      {edited && (
        <form action={resetRiskTexts}>
          <input type="hidden" name="experience" value={experience} />
          <input type="hidden" name="risk" value={riskId} />
          <button
            type="submit"
            className="btn-text"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: colors.muted }}
          >
            Restaurar el texto original
          </button>
        </form>
      )}
    </div>
  );
}

function Labeled({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} style={fieldLabel}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 42,
  borderRadius: 10,
  border: `1.5px solid ${colors.border}`,
  padding: "0 12px",
  fontSize: 14,
  color: colors.ink,
  background: "#fff",
  width: "100%",
  fontFamily: "inherit",
};
