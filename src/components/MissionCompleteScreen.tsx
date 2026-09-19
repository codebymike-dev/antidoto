import { useApp } from "@/state/AppProvider";
import { colors, LOGO_SRC, calSans } from "@/lib/theme";
import { primaryButton } from "@/lib/styles";
import Blobs from "./Blobs";

export default function MissionCompleteScreen() {
  const { state, actions } = useApp();

  const displayName = state.name.trim() || "participante";
  const matchedMission = state.missions.find((m) => m.id === state.matchedMissionId) ?? state.missions[0];
  const matchedGroup = matchedMission.groups.find((g) => g.codigo === state.matchedCodigo) ?? matchedMission.groups[0];

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: colors.pageGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      <Blobs />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          borderRadius: 20,
          padding: "34px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          textAlign: "center",
          boxShadow: colors.cardShadow,
          borderTop: `4px solid ${colors.accentLight}`,
        }}
      >
        <img src={LOGO_SRC} alt="Antídoto" style={{ height: 90 }} />
        <h2 style={{ ...calSans, fontSize: 26, margin: 0, color: colors.ink }}>¡Gran trabajo, {displayName}!</h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: colors.inkSoft, margin: 0 }}>
          Completaste &quot;{matchedMission.title}&quot;. Tu equipo {matchedGroup.empresa} va en {matchedGroup.avance}% de avance colectivo.
        </p>
        <button onClick={actions.backToLanding} style={{ ...primaryButton, height: 50, padding: "0 30px", fontSize: 15 }}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
