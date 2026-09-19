import type { CSSProperties } from "react";
import { useApp } from "@/state/AppProvider";
import { colors, calSans } from "@/lib/theme";
import { filledButton, secondaryButton, card, cardAccent } from "@/lib/styles";
import { ESTADO_STYLES } from "@/lib/data";
import { computeStats, makeParticipantsPreview, trendToPoints } from "@/lib/utils";
import type { Estado } from "@/lib/types";

const ESTADO_FILTER_OPTIONS: { label: string; value: "todos" | Estado }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Pausado", value: "pausado" },
  { label: "Vencido", value: "vencido" },
];

export default function AdminDetail() {
  const { state, actions } = useApp();
  const isEmpresaRole = state.adminRole === "empresa";

  const mission = state.missions.find((m) => m.id === state.selectedMissionId) ?? state.missions[0];
  const scopedGroups = isEmpresaRole ? mission.groups.filter((g) => g.empresa === state.adminCompany) : mission.groups;
  const stats = computeStats(scopedGroups);

  const filteredGroups = scopedGroups.filter(
    (g) =>
      (state.filterEstado === "todos" || g.estado === state.filterEstado) &&
      (!state.searchGroups.trim() || g.empresa.toLowerCase().includes(state.searchGroups.trim().toLowerCase()))
  );

  const metricLabel = "Avance";
  const rankedGroups = [...filteredGroups]
    .sort((a, b) => b.avance - a.avance)
    .map((g, i) => {
      const est = ESTADO_STYLES[g.estado] ?? ESTADO_STYLES.activo;
      return {
        ...g,
        rank: i + 1,
        metricValue: `${g.avance}%`,
        metricWidth: g.avance,
        estadoLabel: est.label,
        estadoBg: est.bg,
        estadoColor: est.color,
        isSelected: state.compareSelection.includes(g.codigo),
        isExpanded: state.expandedGroupCodigo === g.codigo,
        participantsPreview: makeParticipantsPreview(g),
      };
    });

  const trendPoints = trendToPoints(mission.trend ?? []);
  const canCompare = rankedGroups.length > 1;
  const compareSelectionCount = state.compareSelection.length;
  const compareButtonVisible = canCompare && !state.compareOpen && compareSelectionCount >= 2;
  const compareGroups = rankedGroups.filter((g) => state.compareSelection.includes(g.codigo));

  return (
    <div>
      <span onClick={actions.goToAdminMenu} style={{ cursor: "pointer", fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
        ‹ Actividades
      </span>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", margin: "14px 0 20px 0" }}>
        <div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>{mission.tag}</span>
          <h1 style={{ ...calSans, fontSize: 26, margin: "4px 0 6px 0", color: colors.ink }}>{mission.title}</h1>
          <p style={{ fontSize: 14, color: colors.muted, margin: 0, maxWidth: 520 }}>{mission.description}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={actions.goToLive} style={filledButton}>
            ▸ Iniciar sesión en vivo
          </button>
          <button onClick={actions.openPreviewSelected} style={secondaryButton}>
            Vista previa
          </button>
          <button onClick={actions.exportCSV} style={secondaryButton}>
            Exportar CSV
          </button>
          <button onClick={actions.goToNewCodeForSelected} style={{ ...filledButton, padding: "0 18px", fontSize: 13.5 }}>
            ＋ Nuevo código
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 22 }}>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={statLabel}>Participantes</div>
          <div style={statValue}>{stats.totalParticipantes}</div>
        </div>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={statLabel}>Avance promedio</div>
          <div style={statValue}>{stats.avgAvance}%</div>
        </div>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={statLabel}>Grupos activos</div>
          <div style={statValue}>{stats.groupsCount}</div>
        </div>
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ ...statLabel, marginBottom: 8 }}>Tendencia · 6 semanas</div>
          <svg width="140" height="40" viewBox="0 0 140 40" style={{ display: "block" }}>
            <polyline points={trendPoints} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input
          value={state.searchGroups}
          onChange={(e) => actions.setSearchGroups(e.target.value)}
          placeholder="Buscar empresa o grupo..."
          style={{ height: 40, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: "0 12px", fontSize: 13.5, minWidth: 220, flex: 1 }}
        />
        {ESTADO_FILTER_OPTIONS.map((f) => (
          <span
            key={f.value}
            onClick={() => actions.setFilterEstado(f.value)}
            style={{
              cursor: "pointer",
              padding: "9px 14px",
              borderRadius: 9,
              fontSize: 12.5,
              fontWeight: 600,
              color: state.filterEstado === f.value ? colors.accentDark : colors.muted,
              background: state.filterEstado === f.value ? colors.accentTint : "transparent",
              whiteSpace: "nowrap",
            }}
          >
            {f.label}
          </span>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 18, padding: "6px 0", boxShadow: colors.cardShadowSmall, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "28px 32px 1.8fr 1fr 0.9fr 1.3fr 0.8fr 0.9fr 28px", minWidth: 940, alignItems: "center", padding: "14px 22px", fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #EAF6FB" }}>
          <span></span>
          <span>#</span>
          <span>Empresa / grupo</span>
          <span>Código</span>
          <span>Participantes</span>
          <span>{metricLabel}</span>
          <span>Promedio</span>
          <span>Estado</span>
          <span></span>
        </div>
        {rankedGroups.map((g) => (
          <div key={g.codigo} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px 32px 1.8fr 1fr 0.9fr 1.3fr 0.8fr 0.9fr 28px", minWidth: 940, alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #F1FAFD" }}>
              <input type="checkbox" checked={g.isSelected} onChange={() => actions.toggleCompareSelect(g.codigo)} />
              <span style={{ fontWeight: 700, color: colors.accentDark }}>{g.rank}</span>
              <span style={{ fontWeight: 600, color: colors.ink }}>{g.empresa}</span>
              <span style={{ fontSize: 13, color: colors.muted, fontFamily: "monospace" }}>{g.codigo}</span>
              <span style={{ fontSize: 13.5, color: colors.ink }}>{g.participantes}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 7, background: colors.accentTint, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: colors.buttonGradient, width: `${g.metricWidth}%` }} />
                </div>
                <span style={{ fontSize: 12.5, color: colors.accentDark, fontWeight: 600, width: 38 }}>{g.metricValue}</span>
              </div>
              <span style={{ fontSize: 13.5, color: colors.ink }}>{g.promedio}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 100, textAlign: "center", color: g.estadoColor, background: g.estadoBg }}>
                {g.estadoLabel}
              </span>
              <span onClick={() => actions.toggleExpand(g.codigo)} style={{ cursor: "pointer", color: colors.muted, fontSize: 13 }}>
                {g.isExpanded ? "▾" : "▸"}
              </span>
            </div>
            {g.isExpanded && (
              <div style={{ background: "#F7FBFC", borderRadius: 10, margin: "0 22px 12px 22px", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Muestra de participantes
                </span>
                {g.participantsPreview.map((p) => (
                  <div key={p.nombre} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: colors.ink }}>
                    <span>{p.nombre}</span>
                    <span style={{ color: colors.muted }}>
                      Avance {p.avance}% · Puntaje {p.puntaje}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {canCompare && (
        <div style={{ marginTop: 18 }}>
          {state.compareOpen && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink }}>Comparativa de grupos</h3>
                <span onClick={actions.closeCompare} style={{ cursor: "pointer", fontSize: 12.5, color: colors.muted, fontWeight: 600 }}>
                  Cerrar comparación ×
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {compareGroups.map((cg) => (
                  <div key={cg.codigo} style={{ ...cardAccent, display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: colors.ink }}>{cg.empresa}</span>
                    <span style={{ fontSize: 12, color: colors.muted, fontFamily: "monospace" }}>{cg.codigo}</span>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
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
          {compareButtonVisible && (
            <button onClick={actions.openCompare} style={{ ...secondaryButton, height: 42, padding: "0 18px" }}>
              Comparar seleccionados ({compareSelectionCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const statLabel: import("react").CSSProperties = {
  fontSize: 12,
  color: colors.muted,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const statValue: import("react").CSSProperties = {
  ...calSans,
  fontSize: 26,
  color: colors.ink,
  marginTop: 4,
};
