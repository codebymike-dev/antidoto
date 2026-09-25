"use client";

import { useState, type CSSProperties } from "react";
import { contrast, INK, type BrandPalette, type PublicBrand } from "@/lib/brand-palette";
import { colors, calSans } from "@/lib/theme";
import BrandLogo, { CoBrand } from "@/components/BrandLogo";

type BrandLike = Pick<PublicBrand, "name" | "primary" | "secondary" | "logoUrl" | "logoSurface" | "welcome">;
type View = "mision" | "vivo" | "reporte";

const VIEWS: { key: View; label: string; hint: string }[] = [
  { key: "mision", label: "Participante", hint: "Lo que ve quien entra con un código de actividad." },
  { key: "vivo", label: "En vivo", hint: "La pantalla del proyector al abrir una partida." },
  { key: "reporte", label: "Reporte", hint: "El encabezado del reporte PDF de la empresa." },
];

/** Maquetas a escala de las tres pantallas con marca. Se repintan con cada cambio del editor. */
export default function BrandPreview({ brand, palette }: { brand: BrandLike; palette: BrandPalette }) {
  const [view, setView] = useState<View>("mision");
  const current = VIEWS.find((v) => v.key === view)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>
          Vista previa
        </span>
        <div role="tablist" aria-label="Pantalla de la vista previa" style={segmented}>
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={view === v.key}
              onClick={() => setView(v.key)}
              style={{
                ...segment,
                background: view === v.key ? "#fff" : "transparent",
                color: view === v.key ? colors.ink : colors.muted,
                boxShadow: view === v.key ? "0 1px 3px rgba(15,24,29,0.12)" : "none",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        aria-label={`Vista previa: ${current.label}`}
        style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 18px 40px rgba(12,92,125,0.14), 0 0 0 1px rgba(15,24,29,0.06)" }}
      >
        {view === "mision" && <MissionMock brand={brand} p={palette} />}
        {view === "vivo" && <LiveMock brand={brand} p={palette} />}
        {view === "reporte" && <ReportMock brand={brand} p={palette} />}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: colors.muted }}>{current.hint}</p>

      <ContrastSummary palette={palette} />
    </div>
  );
}

function MissionMock({ brand, p }: { brand: BrandLike; p: BrandPalette }) {
  return (
    <div style={{ background: p.pageGradient, padding: "18px 20px 22px", display: "flex", flexDirection: "column", gap: 14, minHeight: 360 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: p.strong }}>‹ Volver</span>
        <CoBrand brand={brand} surface="claro" height={30} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ ...calSans, fontSize: 20, color: colors.ink }}>¡Hola, Laura!</span>
        <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 600, color: p.strong, background: p.tint, padding: "4px 10px", borderRadius: 100 }}>
          Participas junto a {brand.name || "tu empresa"} · 24 personas
        </span>
        {brand.welcome && <span style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.5 }}>{brand.welcome}</span>}
      </div>
      <div style={{ background: "#fff", borderRadius: 14, padding: "16px 16px 18px", boxShadow: "0 10px 24px rgba(15,24,29,0.08)", borderTop: `4px solid ${p.soft}`, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: p.accent, letterSpacing: 1 }}>SEGURIDAD VIAL</span>
        <span style={{ ...calSans, fontSize: 16, color: colors.ink }}>Ruta segura al trabajo</span>
        <span style={{ fontSize: 11.5, color: colors.inkSoft, lineHeight: 1.5 }}>Identifica los riesgos del trayecto y elige cómo prevenirlos.</span>
        <span
          style={{
            alignSelf: "flex-start",
            marginTop: 4,
            padding: "9px 16px",
            borderRadius: 10,
            background: p.buttonGradient,
            color: p.buttonText,
            fontSize: 12,
            fontWeight: 600,
            boxShadow: p.buttonShadow,
          }}
        >
          Comenzar reto
        </span>
      </div>
    </div>
  );
}

function LiveMock({ brand, p }: { brand: BrandLike; p: BrandPalette }) {
  return (
    <div style={{ background: "#0F181D", color: "#fff", padding: "16px 18px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, minHeight: 360, position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: p.graphic, opacity: 0.18, filter: "blur(50px)", top: -90, right: -60 }} />
      <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "flex-start", position: "relative" }}>
        <CoBrand brand={brand} surface="oscuro" height={26} />
      </div>
      <div style={{ position: "relative", background: "#fff", color: INK, borderRadius: 16, padding: "14px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600 }}>
          Únete en <strong style={{ color: p.accent }}>antidoto.co/jugar</strong>
        </span>
        <span style={{ fontSize: 10, color: colors.muted, fontWeight: 600 }}>PIN del juego</span>
        <span style={{ ...calSans, fontSize: 38, letterSpacing: 2, lineHeight: 1.05 }}>482 915</span>
      </div>
      <span style={{ ...calSans, fontSize: 15, position: "relative" }}>5 jugadores</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", position: "relative" }}>
        {["Laura", "Andrés", "Caro", "Juanpa", "Mile"].map((n) => (
          <span key={n} style={{ padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,0.12)", fontSize: 11, fontWeight: 700 }}>
            {n}
          </span>
        ))}
      </div>
      <span style={{ position: "relative", padding: "9px 22px", borderRadius: 10, background: p.liveButton, color: p.liveButtonText, fontWeight: 700, fontSize: 13 }}>
        Comenzar
      </span>
    </div>
  );
}

function ReportMock({ brand, p }: { brand: BrandLike; p: BrandPalette }) {
  const stats = [
    { label: "Participantes", value: "86" },
    { label: "Avance", value: "72%" },
    { label: "Puntaje", value: "8,4" },
  ];
  return (
    <div style={{ background: "#E9EEF0", padding: 16, minHeight: 360 }}>
      <div style={{ background: "#fff", borderRadius: 6, padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 4px 14px rgba(15,24,29,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <BrandLogo brand={brand} surface="claro" height={28} />
          <span style={{ fontSize: 9.5, color: colors.muted, textAlign: "right", lineHeight: 1.4 }}>
            Reporte de actividad
            <br />
            24 sep 2026
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 3, background: `linear-gradient(90deg, ${p.graphic}, ${p.soft})` }} />
        <div>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: p.accent, letterSpacing: 1 }}>SEGURIDAD VIAL</span>
          <div style={{ ...calSans, fontSize: 16, color: colors.ink }}>Ruta segura al trabajo</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: p.tint, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 8.5, color: p.strong, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</div>
              <div style={{ ...calSans, fontSize: 18, color: colors.ink }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[82, 64, 47].map((w, i) => (
            <div key={w} style={{ display: "grid", gridTemplateColumns: "70px 1fr", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9.5, color: colors.inkSoft }}>Riesgo {i + 1}</span>
              <span style={{ height: 7, borderRadius: 7, background: p.tint, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${w}%`, background: p.graphic, borderRadius: 7 }} />
              </span>
            </div>
          ))}
        </div>
        <span style={{ alignSelf: "flex-end", fontSize: 9, color: colors.mutedLight }}>Generado con Antídoto</span>
      </div>
    </div>
  );
}

/** Verificación de legibilidad a la vista: qué pasa AA y qué se ajustó solo. */
function ContrastSummary({ palette: p }: { palette: BrandPalette }) {
  const ratio = contrast(p.button, p.buttonText);
  return (
    <div
      aria-live="polite"
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: 12,
        background: p.adjusted ? "#FFF8E6" : "#EAF7EE",
        color: p.adjusted ? "#8A5A00" : "#1E6B3A",
        fontSize: 12.5,
        lineHeight: 1.5,
      }}
    >
      <span aria-hidden style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3 }}>{p.adjusted ? "i" : "✓"}</span>
      <span>
        {p.adjusted
          ? "Oscurecimos un poco el color de los botones para que el texto se lea bien. Tu color se mantiene en logos, barras y detalles."
          : "Botones y textos pasan el contraste AA de accesibilidad."}{" "}
        <span style={{ opacity: 0.75 }}>Botón {ratio.toFixed(1)}:1.</span>
      </span>
    </div>
  );
}

const segmented: CSSProperties = {
  display: "inline-flex",
  gap: 2,
  padding: 3,
  borderRadius: 10,
  background: "#EDF3F5",
};

const segment: CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.15s ease, color 0.15s ease",
};
