import { useApp } from "@/state/AppProvider";
import { colors, calSans } from "@/lib/theme";
import { filledButton, card } from "@/lib/styles";
import { ESTADO_STYLES } from "@/lib/data";
import type { Estado, ConfigTab } from "@/lib/types";

export default function AdminConfig() {
  const { state, actions } = useApp();
  const isSuperRole = state.adminRole !== "empresa";
  const isEmpresaRole = !isSuperRole;

  const isCodesTab = state.configTab === "codes";
  const isCompaniesTab = state.configTab === "companies" && isSuperRole;
  const isLegalTab = state.configTab === "legal" && isSuperRole;
  const isAuditoriaTab = state.configTab === "auditoria" && isSuperRole;

  const allCodesFlat = state.missions.flatMap((m) => {
    const groups = isEmpresaRole ? m.groups.filter((g) => g.empresa === state.adminCompany) : m.groups;
    return groups.map((g) => {
      const est = ESTADO_STYLES[g.estado] ?? ESTADO_STYLES.activo;
      return { missionTitle: m.title, ...g, estadoLabel: est.label, estadoBg: est.bg, estadoColor: est.color };
    });
  });

  const companiesWithCounts = state.companies.map((name) => ({
    name,
    count: state.missions.reduce((acc, m) => acc + m.groups.filter((g) => g.empresa === name).length, 0),
    confirming: state.confirmDeleteCompany === name,
  }));

  function tabStyle(active: boolean) {
    return {
      cursor: "pointer" as const,
      padding: "10px 18px",
      borderRadius: 10,
      fontSize: 13.5,
      fontWeight: 600 as const,
      color: active ? colors.accentDark : colors.muted,
      background: active ? colors.accentTint : "transparent",
    };
  }

  function setTab(tab: ConfigTab) {
    if (tab === "codes") actions.setTabCodes();
    if (tab === "companies") actions.setTabCompanies();
    if (tab === "legal") actions.setTabLegal();
    if (tab === "auditoria") actions.setTabAuditoria();
  }

  return (
    <div>
      <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 20px 0", color: colors.ink }}>Configuración</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
        <span onClick={() => setTab("codes")} style={tabStyle(isCodesTab)}>
          Códigos y actividades
        </span>
        {isSuperRole && (
          <>
            <span onClick={() => setTab("companies")} style={tabStyle(isCompaniesTab)}>
              Empresas y grupos
            </span>
            <span onClick={() => setTab("legal")} style={tabStyle(isLegalTab)}>
              Legal
            </span>
            <span onClick={() => setTab("auditoria")} style={tabStyle(isAuditoriaTab)}>
              Auditoría
            </span>
          </>
        )}
      </div>

      {isCodesTab && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16, maxWidth: 460 }}>
            <h3 style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink }}>Generar nuevo código</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={label}>Actividad / misión</label>
              <select
                value={state.newCodeMissionId}
                onChange={(e) => actions.setNewCodeMission(e.target.value)}
                style={{ height: 44, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: "0 12px", fontSize: 14 }}
              >
                {state.missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={label}>Empresa o grupo</label>
              <input
                value={state.newCodeEmpresa}
                onChange={(e) => actions.setNewCodeEmpresa(e.target.value)}
                placeholder="Ej. Grupo Acme"
                disabled={isEmpresaRole}
                style={{ height: 44, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: "0 12px", fontSize: 14, background: isEmpresaRole ? "#F4FBFD" : "#ffffff" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={label}>Estado inicial</label>
                <select
                  value={state.newCodeEstado}
                  onChange={(e) => actions.setNewCodeEstado(e.target.value as Estado)}
                  style={{ height: 44, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: "0 10px", fontSize: 13.5 }}
                >
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                </select>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={label}>Vence el</label>
                <input
                  type="date"
                  value={state.newCodeExpira}
                  onChange={(e) => actions.setNewCodeExpira(e.target.value)}
                  style={{ height: 44, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: "0 10px", fontSize: 13.5 }}
                />
              </div>
            </div>
            <button onClick={actions.generateCode} style={{ ...filledButton, height: 46 }}>
              Generar código
            </button>
            {state.lastGeneratedCode && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: colors.accentTint, borderRadius: 10, padding: "12px 16px" }}>
                <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: colors.accentDark }}>{state.lastGeneratedCode}</span>
                <span style={{ fontSize: 12, color: colors.accent, fontWeight: 600 }}>nuevo código</span>
              </div>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 18, padding: "6px 0", boxShadow: colors.cardShadowSmall, overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.1fr 1fr 0.8fr 0.9fr 0.8fr", minWidth: 680, padding: "14px 22px", fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #EAF6FB" }}>
              <span>Actividad</span>
              <span>Empresa / grupo</span>
              <span>Código</span>
              <span>Fecha</span>
              <span>Participantes</span>
              <span>Estado</span>
            </div>
            {allCodesFlat.map((row) => (
              <div key={row.codigo} style={{ display: "grid", gridTemplateColumns: "1.3fr 1.1fr 1fr 0.8fr 0.9fr 0.8fr", minWidth: 680, alignItems: "center", padding: "14px 22px", borderBottom: "1px solid #F1FAFD" }}>
                <span style={{ fontSize: 13.5, color: colors.ink, fontWeight: 600 }}>{row.missionTitle}</span>
                <span style={{ fontSize: 13.5, color: colors.ink }}>{row.empresa}</span>
                <span style={{ fontSize: 12.5, color: colors.muted, fontFamily: "monospace" }}>{row.codigo}</span>
                <span style={{ fontSize: 12.5, color: colors.muted }}>{row.fecha}</span>
                <span style={{ fontSize: 13.5, color: colors.ink }}>{row.participantes}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 100, textAlign: "center", color: row.estadoColor, background: row.estadoBg, width: "fit-content" }}>
                  {row.estadoLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCompaniesTab && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 20, display: "flex", gap: 10, boxShadow: colors.cardShadowSmall }}>
            <input
              value={state.newCompanyName}
              onChange={(e) => actions.setNewCompanyName(e.target.value)}
              placeholder="Nombre de la empresa o grupo"
              style={{ flex: 1, height: 44, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: "0 12px", fontSize: 14 }}
            />
            <button onClick={actions.addCompany} style={{ ...filledButton, padding: "0 18px", fontSize: 13.5 }}>
              ＋ Añadir
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {companiesWithCounts.map((c) => (
              <div key={c.name} style={{ background: "#fff", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 6px 16px rgba(12,92,125,0.06)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5, color: colors.ink }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: colors.muted }}>{c.count} códigos activos</div>
                </div>
                {c.confirming ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: colors.muted }}>¿Eliminar?</span>
                    <span onClick={() => actions.confirmDeleteCompanyYes(c.name)} style={{ cursor: "pointer", fontSize: 12.5, color: colors.danger, fontWeight: 700 }}>
                      Sí
                    </span>
                    <span onClick={actions.cancelDeleteCompany} style={{ cursor: "pointer", fontSize: 12.5, color: colors.muted, fontWeight: 600 }}>
                      Cancelar
                    </span>
                  </div>
                ) : (
                  <span onClick={() => actions.askDeleteCompany(c.name)} style={{ cursor: "pointer", fontSize: 12.5, color: "#C0503F", fontWeight: 600 }}>
                    Eliminar
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLegalTab && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 10, boxShadow: colors.cardShadowSmall }}>
            <h3 style={{ ...calSans, fontSize: 16, margin: 0, color: colors.ink }}>Política de tratamiento de datos</h3>
            <textarea
              value={state.policyText}
              onChange={(e) => actions.setPolicyText(e.target.value)}
              style={{ minHeight: 180, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: 12, fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
            />
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 10, boxShadow: colors.cardShadowSmall }}>
            <h3 style={{ ...calSans, fontSize: 16, margin: 0, color: colors.ink }}>Términos y condiciones</h3>
            <textarea
              value={state.termsText}
              onChange={(e) => actions.setTermsText(e.target.value)}
              style={{ minHeight: 140, borderRadius: 10, border: `1.5px solid ${colors.border}`, padding: 12, fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
            />
          </div>
          <span style={{ fontSize: 12, color: colors.muted }}>Este texto se muestra a los participantes desde el enlace de política en la pantalla de ingreso.</span>
        </div>
      )}

      {isAuditoriaTab && (
        <div style={{ background: "#fff", borderRadius: 18, padding: "6px 0", boxShadow: colors.cardShadowSmall, maxWidth: 680 }}>
          {state.auditLog.map((a, i) => (
            <div key={i} style={{ padding: "14px 22px", borderBottom: "1px solid #F1FAFD", display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13.5, color: colors.ink }}>{a.text}</span>
              <span style={{ fontSize: 11.5, color: colors.muted }}>{a.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const label = {
  fontSize: 12,
  fontWeight: 600 as const,
  color: colors.accentDark,
  textTransform: "uppercase" as const,
};
