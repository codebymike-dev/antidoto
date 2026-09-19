import { useApp } from "@/state/AppProvider";
import { colors, calSans } from "@/lib/theme";
import { filledButton, secondaryButton } from "@/lib/styles";
import { LIVE_ROUNDS } from "@/lib/data";

export default function AdminLive() {
  const { state, actions } = useApp();
  const isEmpresaRole = state.adminRole === "empresa";

  const mission = state.missions.find((m) => m.id === state.selectedMissionId) ?? state.missions[0];
  const scopedGroups = isEmpresaRole ? mission.groups.filter((g) => g.empresa === state.adminCompany) : mission.groups;

  const { status, round, totalRounds, connected } = state.liveSession;
  const isLobby = status === "lobby";
  const isQuestion = status === "question";
  const isReveal = status === "reveal";
  const isFinished = status === "finished";
  const currentRound = round > 0 ? LIVE_ROUNDS[round - 1] : LIVE_ROUNDS[0];
  const roundLabel = `Ronda ${round || 1} de ${totalRounds}`;
  const nextRoundLabel = round >= totalRounds ? "Ver resultados finales" : "Siguiente ronda";

  const liveLeaderboard = scopedGroups
    .map((g) => ({ empresa: g.empresa, score: state.liveScores[g.codigo] || 0, codigo: g.codigo }))
    .sort((a, b) => b.score - a.score)
    .map((g, i) => ({ ...g, rank: i + 1 }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>SESIÓN EN VIVO</span>
          <h1 style={{ ...calSans, fontSize: 26, margin: "4px 0 0 0", color: colors.ink }}>{mission.title}</h1>
        </div>
        <button onClick={actions.exitLive} style={{ ...secondaryButton, border: `1.5px solid ${colors.border}`, color: colors.muted }}>
          Salir de la sesión
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,1.3fr) minmax(240px,1fr)", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: 24, display: "flex", flexDirection: "column", gap: 16, boxShadow: colors.cardShadowSmall }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Control del host</span>

          {isLobby && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: colors.accentTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: colors.accentLight, display: "block", animation: "pulseDot 1.4s ease-in-out infinite" }} />
              </div>
              <div>
                <div style={{ ...calSans, fontSize: 22, color: colors.ink }}>{connected} conectados</div>
                <div style={{ fontSize: 13, color: colors.muted }}>Esperando en la sala antes de iniciar.</div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={actions.simulateJoin} style={{ ...secondaryButton, border: `1.5px solid ${colors.border}` }}>
                  +1 conectado (demo)
                </button>
                <button onClick={actions.startLiveSession} style={{ ...filledButton, padding: "0 22px" }}>
                  Iniciar sesión
                </button>
              </div>
            </div>
          )}

          {isQuestion && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.accentDark }}>{roundLabel}</span>
              <h3 style={{ ...calSans, fontSize: 20, margin: 0, color: colors.ink }}>{currentRound.prompt}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {currentRound.options.map((opt) => (
                  <div key={opt.label} style={{ padding: "12px 14px", borderRadius: 10, background: "#F4FBFD", fontSize: 13.5, color: colors.ink, fontWeight: 600 }}>
                    {opt.label}
                  </div>
                ))}
              </div>
              <button onClick={actions.revealRound} style={{ ...filledButton, height: 46 }}>
                Revelar respuestas
              </button>
            </div>
          )}

          {isReveal && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.accentDark }}>{roundLabel} · Resultados</span>
              <h3 style={{ ...calSans, fontSize: 20, margin: 0, color: colors.ink }}>{currentRound.prompt}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentRound.options.map((opt) => (
                  <div key={opt.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.ink, fontWeight: 600 }}>
                      <span>{opt.label}</span>
                      <span>{opt.pct}%</span>
                    </div>
                    <div style={{ height: 9, background: colors.accentTint, borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: colors.buttonGradient, width: `${opt.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={actions.nextRound} style={{ ...filledButton, height: 46 }}>
                {nextRoundLabel}
              </button>
            </div>
          )}

          {isFinished && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", textAlign: "center", padding: "16px 0" }}>
              <h3 style={{ ...calSans, fontSize: 20, margin: 0, color: colors.ink }}>Sesión finalizada</h3>
              <p style={{ fontSize: 13.5, color: colors.muted, margin: 0 }}>Los resultados quedaron guardados en el detalle de la actividad.</p>
              <button onClick={actions.exitLive} style={{ ...filledButton, padding: "0 20px" }}>
                Volver al detalle
              </button>
            </div>
          )}
        </div>

        <div style={{ background: colors.ink, borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#7C93A0", textTransform: "uppercase", letterSpacing: 0.5 }}>Así lo ven los participantes</span>

          {isLobby && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors.accentLight, display: "block", animation: "pulseDot 1.4s ease-in-out infinite" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.ink }}>Sala de espera</span>
              <span style={{ fontSize: 12.5, color: colors.muted }}>El host aún no ha iniciado la sesión.</span>
            </div>
          )}
          {isQuestion && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.accent }}>{roundLabel}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.ink, lineHeight: 1.4 }}>{currentRound.prompt}</span>
              {currentRound.options.map((opt) => (
                <div key={opt.label} style={{ padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${colors.border}`, fontSize: 12.5, color: colors.accentDark, fontWeight: 600 }}>
                  {opt.label}
                </div>
              ))}
            </div>
          )}
          {isReveal && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.accent }}>Resultado de la ronda</span>
              {currentRound.options.map((opt) => (
                <div key={opt.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: colors.ink, fontWeight: 600 }}>
                  <span>{opt.label}</span>
                  <span>{opt.pct}%</span>
                </div>
              ))}
            </div>
          )}
          {isFinished && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.ink }}>¡Gracias por participar!</span>
              <span style={{ fontSize: 12.5, color: colors.muted }}>Revisa el resultado de tu equipo con tu administrador.</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 18, padding: "6px 0", boxShadow: colors.cardShadowSmall, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "32px 2fr 1fr", minWidth: 400, padding: "14px 22px", fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #EAF6FB" }}>
          <span>#</span>
          <span>Empresa / grupo</span>
          <span>Puntaje en vivo</span>
        </div>
        {liveLeaderboard.map((lg) => (
          <div key={lg.codigo} style={{ display: "grid", gridTemplateColumns: "32px 2fr 1fr", minWidth: 400, alignItems: "center", padding: "14px 22px", borderBottom: "1px solid #F1FAFD" }}>
            <span style={{ fontWeight: 700, color: colors.accentDark }}>{lg.rank}</span>
            <span style={{ fontWeight: 600, color: colors.ink }}>{lg.empresa}</span>
            <span style={{ ...calSans, fontSize: 16, color: colors.accent }}>{lg.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
