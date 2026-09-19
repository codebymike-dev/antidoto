import { useApp } from "@/state/AppProvider";
import { colors, LOGO_SRC, calSans } from "@/lib/theme";
import { fieldLabel, fieldInput, primaryButton } from "@/lib/styles";
import Blobs from "./Blobs";

export default function AdminLoginScreen() {
  const { state, actions } = useApp();
  const isEmpresaRole = state.loginRole === "empresa";

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
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 34, width: "100%", maxWidth: 420 }}>
        <img src={LOGO_SRC} alt="Antídoto" style={{ height: 132 }} />
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 style={{ ...calSans, fontSize: 28, lineHeight: 1.15, margin: 0, color: colors.ink }}>Portal administrador</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, margin: 0 }}>Gestiona actividades, grupos y resultados.</p>
        </div>
        <div style={{ width: "100%", background: "#ffffff", borderRadius: 20, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16, boxShadow: colors.cardShadow, borderTop: `4px solid ${colors.accentLight}` }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              onClick={actions.setLoginRoleSuper}
              style={{
                cursor: "pointer",
                flex: 1,
                textAlign: "center",
                padding: 10,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: state.loginRole === "super" ? colors.accentDark : colors.muted,
                background: state.loginRole === "super" ? colors.accentTint : "transparent",
              }}
            >
              Superadmin
            </span>
            <span
              onClick={actions.setLoginRoleEmpresa}
              style={{
                cursor: "pointer",
                flex: 1,
                textAlign: "center",
                padding: 10,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: isEmpresaRole ? colors.accentDark : colors.muted,
                background: isEmpresaRole ? colors.accentTint : "transparent",
              }}
            >
              Admin de empresa
            </span>
          </div>
          {isEmpresaRole && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={fieldLabel}>Empresa</label>
              <select
                value={state.loginCompany}
                onChange={(e) => actions.setLoginCompany(e.target.value)}
                style={{ height: 46, borderRadius: 11, border: `1.5px solid ${colors.border}`, padding: "0 12px", fontSize: 14.5 }}
              >
                {state.companies.map((co) => (
                  <option key={co} value={co}>
                    {co}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={fieldLabel}>Usuario</label>
            <input placeholder="admin@antidoto.co" style={fieldInput} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={fieldLabel}>Contraseña</label>
            <input type="password" placeholder="••••••••" style={fieldInput} />
          </div>
          <button onClick={actions.submitLogin} style={primaryButton}>
            Ingresar
          </button>
        </div>
        <span onClick={actions.backToLanding} style={{ cursor: "pointer", fontSize: 13, color: colors.muted }}>
          ‹ Volver al sitio
        </span>
      </div>
    </div>
  );
}
