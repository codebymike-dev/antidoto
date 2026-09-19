import { useApp } from "@/state/AppProvider";
import { colors, LOGO_SRC, calSans } from "@/lib/theme";
import { cardAccent, filledButton } from "@/lib/styles";
import { GAME_MODE } from "@/lib/data";

export default function MissionScreen() {
  const { state, actions } = useApp();

  const displayName = state.name.trim() || "participante";
  const matchedMission = state.missions.find((m) => m.id === state.matchedMissionId) ?? state.missions[0];
  const matchedGroup = matchedMission.groups.find((g) => g.codigo === state.matchedCodigo) ?? matchedMission.groups[0];
  const isAlreadyCompleted = !!state.matchedCodigo && state.completedCodes.includes(state.matchedCodigo);
  const showPausedNotice = !isAlreadyCompleted && matchedGroup.estado === "pausado";
  const modeLabel =
    GAME_MODE === "sincronizado"
      ? "Modo en vivo · todo el equipo responde a la vez"
      : "Modo a tu ritmo · avanza cuando quieras";

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: colors.pageGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span onClick={actions.backToLanding} style={{ cursor: "pointer", fontSize: 14, color: colors.accentDark, fontWeight: 600 }}>
            ‹ Volver
          </span>
          <img src={LOGO_SRC} alt="Antídoto" style={{ height: 120 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ ...calSans, fontSize: 28, margin: 0, color: colors.ink }}>¡Hola, {displayName}!</h2>
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 8,
              background: colors.accentTint,
              padding: "6px 14px",
              borderRadius: 100,
              fontSize: 13,
              color: colors.accentDark,
              fontWeight: 600,
            }}
          >
            Participas junto a {matchedGroup.empresa} · {matchedGroup.participantes} personas ya se unieron
          </div>
        </div>

        {isAlreadyCompleted ? (
          <div style={cardAccent}>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.accent, letterSpacing: 1.2 }}>{matchedMission.tag}</span>
            <h3 style={{ ...calSans, fontSize: 22, margin: "10px 0 0", color: colors.ink }}>Ya completaste este reto</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: colors.inkSoft, margin: "10px 0 0" }}>
              Gracias por participar en &quot;{matchedMission.title}&quot;. Tu equipo {matchedGroup.empresa} sigue avanzando en conjunto.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {showPausedNotice && (
              <div style={{ background: "#FFF3D6", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#A66B00", fontWeight: 600 }}>
                Esta actividad está pausada temporalmente por tu administrador.
              </div>
            )}
            <div style={{ ...cardAccent, display: "flex", flexDirection: "column", gap: 14, padding: "30px 26px" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.accent, letterSpacing: 1.2 }}>{matchedMission.tag}</span>
              <h3 style={{ ...calSans, fontSize: 24, margin: 0, color: colors.ink }}>{matchedMission.title}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: colors.inkSoft, margin: 0 }}>{matchedMission.description}</p>
              <span style={{ fontSize: 12.5, color: colors.accent, fontWeight: 600 }}>{modeLabel}</span>
              <button
                onClick={actions.finishMission}
                style={{ ...filledButton, alignSelf: "flex-start", height: 50, padding: "0 28px", fontSize: 15, marginTop: 8, boxShadow: colors.buttonShadow }}
              >
                Comenzar reto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
