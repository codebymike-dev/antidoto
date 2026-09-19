import { useApp } from "@/state/AppProvider";
import { colors } from "@/lib/theme";

export default function PolicyModal() {
  const { state, actions } = useApp();
  if (!state.policyModalOpen) return null;

  const isPrivacidad = state.policyModalTab === "privacidad";

  function tabStyle(active: boolean) {
    return {
      cursor: "pointer" as const,
      padding: "9px 14px",
      borderRadius: 9,
      fontSize: 12.5,
      fontWeight: 600 as const,
      color: active ? colors.accentDark : colors.muted,
      background: active ? colors.accentTint : "transparent",
    };
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) actions.closePolicyModal();
      }}
      style={{ position: "fixed", inset: 0, background: "rgba(15,24,29,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 110 }}
    >
      <div style={{ width: "100%", maxWidth: 560, maxHeight: "80vh", background: "#fff", borderRadius: 20, padding: "28px 26px", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 30px 60px rgba(0,0,0,0.3)", borderTop: `4px solid ${colors.accentLight}`, position: "relative" }}
      >
        <span onClick={actions.closePolicyModal} style={{ position: "absolute", top: 14, right: 18, cursor: "pointer", fontSize: 20, color: colors.mutedLight }}>
          ×
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <span onClick={() => actions.setPolicyModalTab("privacidad")} style={tabStyle(isPrivacidad)}>
            Política de datos
          </span>
          <span onClick={() => actions.setPolicyModalTab("terminos")} style={tabStyle(!isPrivacidad)}>
            Términos y condiciones
          </span>
        </div>
        <div style={{ overflowY: "auto", fontSize: 13, lineHeight: 1.7, color: colors.inkSoft, whiteSpace: "pre-wrap" }}>
          {isPrivacidad ? state.policyText : state.termsText}
        </div>
      </div>
    </div>
  );
}
