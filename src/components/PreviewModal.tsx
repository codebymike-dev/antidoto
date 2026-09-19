import { useApp } from "@/state/AppProvider";
import { colors, calSans } from "@/lib/theme";

export default function PreviewModal() {
  const { state, actions } = useApp();
  const mission = state.missions.find((m) => m.id === state.previewMissionId);
  if (!mission) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) actions.closePreview();
      }}
      style={{ position: "fixed", inset: 0, background: "rgba(15,24,29,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 100 }}
    >
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, padding: "30px 26px", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 30px 60px rgba(0,0,0,0.3)", borderTop: `4px solid ${colors.accentLight}`, position: "relative" }}
      >
        <span onClick={actions.closePreview} style={{ position: "absolute", top: 14, right: 18, cursor: "pointer", fontSize: 20, color: colors.mutedLight }}>
          ×
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>{mission.tag}</span>
        <h3 style={{ ...calSans, fontSize: 22, margin: 0, color: colors.ink }}>{mission.title}</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: colors.inkSoft, margin: 0 }}>{mission.description}</p>
        <span style={{ fontSize: 12, color: colors.muted }}>Así lo ve el participante, vista de solo lectura para el administrador.</span>
      </div>
    </div>
  );
}
