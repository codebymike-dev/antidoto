import { useApp } from "@/state/AppProvider";
import { colors, LOGO_SRC, calSans } from "@/lib/theme";
import { fieldLabel, fieldInput, primaryButton } from "@/lib/styles";
import Blobs from "./Blobs";

export default function LandingScreen() {
  const { state, actions } = useApp();

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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 34,
          width: "100%",
          maxWidth: 420,
        }}
      >
        <img src={LOGO_SRC} alt="Antídoto" style={{ height: 192 }} />
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 style={{ ...calSans, fontSize: 34, lineHeight: 1.15, margin: 0, color: colors.ink }}>
            Tu pausa con propósito empieza aquí
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, margin: 0 }}>
            Ingresa tu nombre y el código de tu actividad para unirte a la misión de tu equipo.
          </p>
        </div>
        <div
          style={{
            width: "100%",
            background: "#ffffff",
            borderRadius: 20,
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: colors.cardShadow,
            borderTop: `4px solid ${colors.accentLight}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={fieldLabel}>Tu nombre</label>
            <input
              value={state.name}
              onChange={(e) => actions.setName(e.target.value)}
              placeholder="Ej. Camila Ríos"
              style={fieldInput}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={fieldLabel}>Código de actividad</label>
            <input
              value={state.code}
              onChange={(e) => actions.setCode(e.target.value)}
              placeholder="Ej. RP-ACME24"
              style={{ ...fieldInput, textTransform: "uppercase" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <input
              type="checkbox"
              checked={state.acceptedPolicy}
              onChange={(e) => actions.setAcceptedPolicy(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.4 }}>
              Acepto la{" "}
              <span
                onClick={() => actions.openPolicyModal("privacidad")}
                style={{ cursor: "pointer", color: colors.accent, fontWeight: 600 }}
              >
                política de tratamiento de datos
              </span>{" "}
              y los{" "}
              <span
                onClick={() => actions.openPolicyModal("terminos")}
                style={{ cursor: "pointer", color: colors.accent, fontWeight: 600 }}
              >
                términos y condiciones
              </span>
              .
            </span>
          </div>
          <button onClick={actions.startMission} style={primaryButton}>
            Comenzar mi pausa
          </button>
          {state.codeError && (
            <span style={{ fontSize: 12.5, color: colors.danger, fontWeight: 600 }}>{state.codeError}</span>
          )}
        </div>
        <span onClick={actions.goToAdminLogin} style={{ cursor: "pointer", fontSize: 13, color: colors.muted }}>
          ¿Eres administrador?{" "}
          <span style={{ color: colors.accent, fontWeight: 600 }}>Entrar al portal</span>
        </span>
        <a
          href="https://antidotocolombia.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12.5, color: colors.muted, fontWeight: 600 }}
        >
          Visitar antidotocolombia.com ↗
        </a>
      </div>
    </div>
  );
}

const fieldLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: colors.accentDark,
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

export const fieldInput: CSSProperties = {
  height: 48,
  borderRadius: 12,
  border: `1.5px solid ${colors.border}`,
  padding: "0 14px",
  fontSize: 15,
  outline: "none",
  color: colors.ink,
  width: "100%",
};

export const primaryButton: CSSProperties = {
  height: 52,
  borderRadius: 12,
  border: "none",
  background: colors.buttonGradient,
  color: "#ffffff",
  fontWeight: 600,
  fontSize: 15.5,
  cursor: "pointer",
  marginTop: 6,
  boxShadow: colors.buttonShadow,
};
