import { useApp } from "@/state/AppProvider";
import { colors, LOGO_SRC } from "@/lib/theme";
import { GridIcon, GearIcon, LogoutIcon, BellIcon } from "@/components/icons";
import AdminMenu from "./AdminMenu";
import AdminDetail from "./AdminDetail";
import AdminConfig from "./AdminConfig";
import AdminLive from "./AdminLive";

export default function AdminShell() {
  const { state, actions } = useApp();

  const isEmpresaRole = state.adminRole === "empresa";
  const roleTitle = isEmpresaRole ? "Admin de empresa" : "Superadmin";
  const roleSubtitle = isEmpresaRole ? state.adminCompany ?? "" : "Acceso total";
  const roleInitial = isEmpresaRole ? (state.adminCompany ?? "?").charAt(0).toUpperCase() : "S";

  const navActivitiesOn = state.screen === "admin-menu" || state.screen === "admin-detail" || state.screen === "admin-live";
  const navConfigOn = state.screen === "admin-config";
  const hasUnread = state.notifications.some((n) => !n.read);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4FBFD" }}>
      <div style={{ width: 250, flexShrink: 0, background: colors.ink, display: "flex", flexDirection: "column", padding: "24px 16px", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", borderRadius: 11, padding: "6px 10px", display: "flex", alignItems: "center", width: "fit-content" }}>
            <img src={LOGO_SRC} alt="Antídoto" style={{ height: 36 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: colors.buttonGradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {roleInitial}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fff" }}>{roleTitle}</span>
              <span style={{ fontSize: 11, color: "#7C93A0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{roleSubtitle}</span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.muted, letterSpacing: 0.8, textTransform: "uppercase", padding: "0 10px", marginBottom: 2 }}>
            Menú
          </span>
          <span
            onClick={actions.goToAdminMenu}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 14px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: navActivitiesOn ? "#ffffff" : "#9FB8C2",
              background: navActivitiesOn ? "rgba(59,200,243,0.18)" : "transparent",
            }}
          >
            <GridIcon />
            Actividades
          </span>
          <span
            onClick={actions.goToAdminConfig}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 14px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: navConfigOn ? "#ffffff" : "#9FB8C2",
              background: navConfigOn ? "rgba(59,200,243,0.18)" : "transparent",
            }}
          >
            <GearIcon />
            Configuración
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span onClick={actions.logout} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: "#9FB8C2" }}>
            <LogoutIcon />
            Cerrar sesión
          </span>
        </div>
      </div>

      <div style={{ flex: 1, padding: "36px 40px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginBottom: 24 }}>
          <div style={{ position: "relative" }}>
            <span
              onClick={actions.toggleNotifications}
              style={{ cursor: "pointer", width: 38, height: 38, borderRadius: 11, background: "#fff", boxShadow: colors.cardShadowSmall, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            >
              <BellIcon />
              {hasUnread && (
                <span style={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: "50%", background: "#E0553B" }} />
              )}
            </span>
            {state.notifOpen && (
              <div style={{ position: "absolute", top: 46, right: 0, width: 300, background: "#fff", borderRadius: 14, boxShadow: "0 20px 45px rgba(12,92,125,0.18)", padding: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 20 }}>
                {state.notifications.map((n) => (
                  <div key={n.id} style={{ padding: "10px 12px", borderRadius: 10, background: n.read ? "transparent" : colors.accentTint, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 12.5, color: colors.ink, lineHeight: 1.4 }}>{n.text}</span>
                    <span style={{ fontSize: 11, color: colors.muted }}>{n.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {state.screen === "admin-menu" && <AdminMenu />}
        {state.screen === "admin-detail" && <AdminDetail />}
        {state.screen === "admin-config" && <AdminConfig />}
        {state.screen === "admin-live" && <AdminLive />}
      </div>
    </div>
  );
}
