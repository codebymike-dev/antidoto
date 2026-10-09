"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { assignActivity, type AssignState } from "@/lib/actions";
import { colors, calSans } from "@/lib/theme";
import { card, fieldLabel, filledButton } from "@/lib/styles";
import SceneThumb from "@/components/experience/SceneThumb";
import BuildThumb from "@/components/bricks/BuildThumb";
import type { BuildKind } from "@/lib/bricks/challenges";
import type { ExperienceDef } from "@/lib/experiences/types";
import { CARGO_LIMITS, DEFAULT_CARGOS } from "@/lib/profile";

interface Props {
  companies: { id: number; name: string }[];
  /** Escenas y retos de construcción: cada uno con su miniatura. */
  activities: { key: string; thumb: { scene: ExperienceDef["scene"] } | { build: BuildKind }; title: string; detail: string }[];
  defaultCompany: number | null;
  defaultActivity: string | null;
  /** Cargos del último código de cada empresa, para proponerlos otra vez. */
  cargosByCompany: Record<number, string[]>;
}

export default function AssignForm({ companies, activities, defaultCompany, defaultActivity, cargosByCompany }: Props) {
  const [state, action, pending] = useActionState<AssignState, FormData>(assignActivity, null);
  const cargosFor = (id: number | null) => ((id && cargosByCompany[id]) || DEFAULT_CARGOS).join("\n");
  const [askCargo, setAskCargo] = useState(true);
  const [cargos, setCargos] = useState(() => cargosFor(defaultCompany));
  // Al cambiar de empresa se proponen sus cargos, salvo que el admin ya haya escrito los suyos.
  const [cargosEdited, setCargosEdited] = useState(false);
  const cargoCount = cargos.split("\n").filter((c) => c.trim()).length;

  if (companies.length === 0) {
    return (
      <div style={{ ...card, padding: 22, fontSize: 14, color: colors.inkSoft, lineHeight: 1.55 }}>
        Primero crea la empresa.{" "}
        <Link href="/admin/empresas/nueva" style={{ color: colors.accent, fontWeight: 700 }}>
          Crear empresa ›
        </Link>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <fieldset style={fieldset}>
        <legend style={legend}>
          <Step n={1} /> ¿Para qué empresa?
        </legend>
        <select
          name="companyId"
          defaultValue={defaultCompany ?? ""}
          onChange={(e) => {
            if (!cargosEdited) setCargos(cargosFor(Number(e.target.value)));
          }}
          required
          aria-label="Empresa"
          style={{ height: 46, borderRadius: 12, border: `1.5px solid ${colors.border}`, padding: "0 12px", fontSize: 15, background: "#fff", color: colors.ink, maxWidth: 420 }}
        >
          <option value="" disabled>
            Elige una empresa
          </option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12.5, color: colors.muted }}>
          ¿No está en la lista?{" "}
          <Link href="/admin/empresas/nueva" style={{ color: colors.accent, fontWeight: 600 }}>
            Crea la empresa primero
          </Link>
          .
        </span>
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>
          <Step n={2} /> ¿Qué actividad?
        </legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
          {activities.map((a) => (
            <label key={a.key} className="assign-option" style={{ ...card, padding: 0, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", position: "relative" }}>
              <input
                type="radio"
                name="experience"
                value={a.key}
                defaultChecked={a.key === defaultActivity}
                required
                style={{ position: "absolute", top: 12, right: 12, width: 18, height: 18, accentColor: colors.accent, zIndex: 1 }}
              />
              {"scene" in a.thumb ? (
                <SceneThumb scene={a.thumb.scene} label={`Escena de ${a.title}`} />
              ) : (
                <BuildThumb kind={a.thumb.build} label={`Ladrillos de ${a.title}`} />
              )}
              <span style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ ...calSans, fontSize: 16, color: colors.ink }}>{a.title}</span>
                <span style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.45 }}>{a.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>
          <Step n={3} /> ¿Hasta cuándo se puede jugar?&nbsp;<span style={{ fontWeight: 400, color: colors.muted, fontSize: 13 }}>(opcional)</span>
        </legend>
        <input
          type="date"
          name="expira"
          aria-label="Último día para jugar"
          style={{ height: 46, borderRadius: 12, border: `1.5px solid ${colors.border}`, padding: "0 12px", fontSize: 15, maxWidth: 220 }}
        />
        <span style={{ fontSize: 12.5, color: colors.muted }}>Si lo dejas vacío, el código funciona hasta que lo pauses o lo quites. Lo puedes cambiar después.</span>
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>
          <Step n={4} /> ¿Qué datos le pedimos a cada participante?
        </legend>
        <span style={{ fontSize: 12.5, color: colors.muted, marginTop: -4, lineHeight: 1.5 }}>
          Se piden en la bienvenida, siempre con listas para elegir: así los resultados se pueden filtrar por cargo y por lugar sin nombres
          escritos de mil formas.
        </span>
        <div style={{ ...card, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="askCargo"
              checked={askCargo}
              onChange={(e) => setAskCargo(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: colors.accent, marginTop: 1 }}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>Cargo</span>
              <span style={{ fontSize: 12.5, color: colors.muted }}>El participante elige uno de los cargos que escribas aquí.</span>
            </span>
          </label>
          {askCargo && (
            <span style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 28 }}>
              <textarea
                name="cargos"
                value={cargos}
                onChange={(e) => {
                  setCargos(e.target.value);
                  setCargosEdited(true);
                }}
                rows={Math.min(12, Math.max(5, cargoCount + 1))}
                aria-label="Cargos, uno por línea"
                style={{ borderRadius: 12, border: `1.5px solid ${colors.border}`, padding: "10px 12px", fontSize: 14, lineHeight: 1.55, fontFamily: "inherit", resize: "vertical", color: colors.ink }}
              />
              <span style={{ fontSize: 12, color: colors.muted }}>
                Uno por línea · {cargoCount} de máximo {CARGO_LIMITS.items}. Usa los nombres con los que la empresa quiere ver sus reportes.
              </span>
            </span>
          )}
        </div>
        <label style={{ ...card, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" name="askPlace" defaultChecked style={{ width: 18, height: 18, accentColor: colors.accent, marginTop: 1 }} />
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>Departamento y municipio</span>
            <span style={{ fontSize: 12.5, color: colors.muted }}>
              Los 33 departamentos y 1.122 municipios de Colombia según el DANE. No hay nada que configurar.
            </span>
          </span>
        </label>
      </fieldset>

      {state?.error && (
        <p role="alert" style={{ margin: 0, padding: "12px 16px", borderRadius: 12, background: "#FCE4E1", color: colors.danger, fontSize: 13.5, fontWeight: 600 }}>
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-filled" style={{ ...filledButton, height: 50, alignSelf: "flex-start", padding: "0 26px", fontSize: 15, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Creando el código…" : "Asignar y crear código"}
      </button>
    </form>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 8, background: colors.ink, color: "#fff", fontSize: 12.5, fontWeight: 700, marginRight: 8 }}
    >
      {n}
    </span>
  );
}

const fieldset = { border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" as const, gap: 10, minWidth: 0 };
const legend = { ...fieldLabel, textTransform: "none" as const, letterSpacing: 0, fontSize: 15, color: colors.ink, padding: 0, marginBottom: 10, display: "flex", alignItems: "center" };
