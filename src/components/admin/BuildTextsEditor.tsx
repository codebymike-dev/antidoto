"use client";

import { useActionState } from "react";
import { resetBuildTexts, saveBuildTexts, type SaveBuildTextsState } from "@/lib/build-actions";
import { LIMITS, type BuildTexts } from "@/lib/bricks/challenges";
import { colors } from "@/lib/theme";
import { fieldLabel, filledButton } from "@/lib/styles";

interface Props {
  build: string;
  texts: BuildTexts;
  edited: boolean;
}

/** Formulario de un reto de construcción: título, consigna y pregunta de cierre. */
export default function BuildTextsEditor({ build, texts, edited }: Props) {
  // Igual que en los riesgos: al restaurar se remonta el formulario para mostrar los originales.
  const [resets, resetAction] = useActionState<number, FormData>(resetBuildTexts, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <EditorForm key={resets} build={build} texts={texts} />
      {edited && (
        <form action={resetAction}>
          <input type="hidden" name="build" value={build} />
          <button
            type="submit"
            className="btn-text"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: colors.muted }}
          >
            Restaurar los textos originales
          </button>
        </form>
      )}
    </div>
  );
}

function EditorForm({ build, texts }: Omit<Props, "edited">) {
  const [state, action, pending] = useActionState<SaveBuildTextsState, FormData>(saveBuildTexts, null);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="build" value={build} />
      <Labeled label="Título del reto" htmlFor="bt-title">
        <input id="bt-title" name="title" defaultValue={texts.title} maxLength={LIMITS.title} required style={inputStyle} />
      </Labeled>
      <Labeled label="Consigna (lo primero que lee el participante)" htmlFor="bt-prompt">
        <textarea id="bt-prompt" name="prompt" defaultValue={texts.prompt} maxLength={LIMITS.prompt} required rows={3} style={areaStyle} />
      </Labeled>
      <Labeled label="Pregunta para pensar al cierre (opcional)" htmlFor="bt-reflection">
        <textarea id="bt-reflection" name="reflection" defaultValue={texts.reflection} maxLength={LIMITS.reflection} rows={2} style={areaStyle} />
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

const areaStyle: React.CSSProperties = { ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", lineHeight: 1.45 };
