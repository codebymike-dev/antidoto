import { useApp } from "@/state/AppProvider";
import { colors, calSans } from "@/lib/theme";
import { filledButton, card } from "@/lib/styles";
import { computeStats } from "@/lib/utils";

export default function AdminMenu() {
  const { state, actions } = useApp();
  const isEmpresaRole = state.adminRole === "empresa";
  const isSuperRole = !isEmpresaRole;

  const missionsForMenu = state.missions
    .map((m) => {
      const scopedGroups = isEmpresaRole ? m.groups.filter((g) => g.empresa === state.adminCompany) : m.groups;
      const stats = computeStats(scopedGroups);
      return { ...m, ...stats };
    })
    .filter((m) => !isEmpresaRole || m.groupsCount > 0)
    .filter((m) => !state.searchMenu.trim() || m.title.toLowerCase().includes(state.searchMenu.trim().toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Actividades</h1>
          <p style={{ fontSize: 14, color: colors.muted, margin: 0 }}>Misiones activas y el avance de cada grupo participante.</p>
        </div>
        <button onClick={actions.goToNewCode} style={filledButton}>
          ＋ Nueva actividad
        </button>
      </div>
      <input
        value={state.searchMenu}
        onChange={(e) => actions.setSearchMenu(e.target.value)}
        placeholder="Buscar actividad..."
        style={{ height: 42, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: "0 14px", fontSize: 13.5, maxWidth: 280, marginBottom: 20, display: "block" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {missionsForMenu.map((m) => (
          <div key={m.id} style={card}>
            <div onClick={() => actions.openMission(m.id)} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>{m.tag}</span>
              <h3 style={{ ...calSans, fontSize: 19, margin: 0, color: colors.ink }}>{m.title}</h3>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: colors.muted }}>
                <span>{m.groupsCount} grupos</span>
                <span>{m.totalParticipantes} participantes</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: colors.accentDark, fontWeight: 600 }}>
                  <span>Avance promedio</span>
                  <span>{m.avgAvance}%</span>
                </div>
                <div style={{ height: 8, background: colors.accentTint, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: colors.buttonGradient, borderRadius: 8, width: `${m.avgAvance}%` }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12, borderTop: "1px solid #F1FAFD", paddingTop: 12, marginTop: 14 }}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  actions.setPreview(m.id);
                }}
                style={{ cursor: "pointer", color: colors.accent, fontWeight: 600 }}
              >
                Vista previa
              </span>
              {isSuperRole && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.duplicateMission(m.id);
                  }}
                  style={{ cursor: "pointer", color: colors.muted, fontWeight: 600 }}
                >
                  Duplicar
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
