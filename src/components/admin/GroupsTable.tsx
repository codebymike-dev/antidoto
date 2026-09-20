"use client";

import { useState } from "react";
import { colors, calSans } from "@/lib/theme";
import { secondaryButton, cardAccent } from "@/lib/styles";
import { ESTADO_STYLES } from "@/lib/data";
import type { Estado } from "@/lib/types";

interface Group {
  id: number;
  codigo: string;
  empresa: string;
  participantes: number;
  avance: number;
  promedio: number;
  estado: Estado;
  participantsPreview: { nombre: string; avance: number; puntaje: string }[];
}

const COLUMNS = "28px 32px 1.8fr 1fr 0.9fr 1.3fr 0.8fr 0.9fr 28px";

export default function GroupsTable({ groups }: { groups: Group[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const compareGroups = groups.filter((g) => selection.includes(g.codigo));
  const canCompare = groups.length > 1;

  function toggleSelect(codigo: string) {
    setSelection((prev) => (prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]));
  }

  return (
    <>
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "6px 0",
          boxShadow: colors.cardShadowSmall,
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: COLUMNS,
            minWidth: 940,
            alignItems: "center",
            padding: "14px 22px",
            fontSize: 12,
            fontWeight: 700,
            color: colors.muted,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            borderBottom: "1px solid #EAF6FB",
          }}
        >
          <span />
          <span>#</span>
          <span>Empresa / grupo</span>
          <span>Código</span>
          <span>Participantes</span>
          <span>Avance</span>
          <span>Promedio</span>
          <span>Estado</span>
          <span />
        </div>

        {groups.length === 0 && (
          <div style={{ padding: "18px 22px", fontSize: 13.5, color: colors.muted }}>
            Ningún grupo coincide con el filtro.
          </div>
        )}

        {groups.map((g, i) => {
          const est = ESTADO_STYLES[g.estado] ?? ESTADO_STYLES.activo;
          const isExpanded = expanded === g.codigo;
          return (
            <div key={g.codigo} style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: COLUMNS,
                  minWidth: 940,
                  alignItems: "center",
                  padding: "16px 22px",
                  borderBottom: "1px solid #F1FAFD",
                }}
              >
                <input
                  type="checkbox"
                  checked={selection.includes(g.codigo)}
                  onChange={() => toggleSelect(g.codigo)}
                  aria-label={`Seleccionar ${g.empresa}`}
                />
                <span style={{ fontWeight: 700, color: colors.accentDark }}>{i + 1}</span>
                <span style={{ fontWeight: 600, color: colors.ink }}>{g.empresa}</span>
                <span style={{ fontSize: 13, color: colors.muted, fontFamily: "monospace" }}>{g.codigo}</span>
                <span style={{ fontSize: 13.5, color: colors.ink }}>{g.participantes}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 7, background: colors.accentTint, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: colors.buttonGradient, width: `${g.avance}%` }} />
                  </div>
                  <span style={{ fontSize: 12.5, color: colors.accentDark, fontWeight: 600, width: 38 }}>
                    {g.avance}%
                  </span>
                </div>
                <span style={{ fontSize: 13.5, color: colors.ink }}>{g.promedio}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: 100,
                    textAlign: "center",
                    color: est.color,
                    background: est.bg,
                  }}
                >
                  {est.label}
                </span>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : g.codigo)}
                  aria-label={isExpanded ? "Contraer" : "Expandir"}
                  aria-expanded={isExpanded}
                  className="btn-text"
                  style={{ cursor: "pointer", color: colors.muted, fontSize: 13, background: "none", border: "none" }}
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
              </div>

              {isExpanded && (
                <div
                  style={{
                    background: "#F7FBFC",
                    borderRadius: 10,
                    margin: "0 22px 12px 22px",
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: colors.muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    Muestra de participantes
                  </span>
                  {g.participantsPreview.length === 0 && (
                    <span style={{ fontSize: 13, color: colors.muted }}>Todavía nadie ha entrado con este código.</span>
                  )}
                  {g.participantsPreview.map((p, idx) => (
                    <div
                      key={`${p.nombre}-${idx}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: colors.ink,
                      }}
                    >
                      <span>{p.nombre}</span>
                      <span style={{ color: colors.muted }}>
                        Avance {p.avance}% · Puntaje {p.puntaje}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canCompare && (
        <div style={{ marginTop: 18 }}>
          {compareOpen && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink }}>Comparativa de grupos</h3>
                <button
                  type="button"
                  onClick={() => {
                    setCompareOpen(false);
                    setSelection([]);
                  }}
                  className="btn-text"
                  style={{
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: colors.muted,
                    fontWeight: 600,
                    background: "none",
                    border: "none",
                  }}
                >
                  Cerrar comparación ×
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {compareGroups.map((cg) => (
                  <div key={cg.codigo} style={{ ...cardAccent, padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: colors.ink }}>{cg.empresa}</span>
                    <span style={{ fontSize: 12, color: colors.muted, fontFamily: "monospace" }}>{cg.codigo}</span>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: colors.accentDark,
                        fontWeight: 600,
                      }}
                    >
                      <span>Avance</span>
                      <span>{cg.avance}%</span>
                    </div>
                    <div style={{ height: 7, background: colors.accentTint, borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: colors.buttonGradient, width: `${cg.avance}%` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.muted }}>
                      <span>Promedio</span>
                      <span>{cg.promedio}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.muted }}>
                      <span>Participantes</span>
                      <span>{cg.participantes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!compareOpen && selection.length >= 2 && (
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="btn-secondary"
              style={{ ...secondaryButton, height: 42, padding: "0 18px" }}
            >
              Comparar seleccionados ({selection.length})
            </button>
          )}
        </div>
      )}
    </>
  );
}
