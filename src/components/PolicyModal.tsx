"use client";

import { useEffect } from "react";
import { colors } from "@/lib/theme";
import { tabButton, tabButtonActive } from "@/lib/styles";

interface Props {
  tab: "privacidad" | "terminos";
  onTab: (tab: "privacidad" | "terminos") => void;
  onClose: () => void;
  policyText: string;
  termsText: string;
}

export default function PolicyModal({ tab, onTab, onClose, policyText, termsText }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function tabStyle(active: boolean) {
    return {
      ...(active ? tabButtonActive : tabButton),
      cursor: "pointer" as const,
      fontSize: 12.5,
      color: active ? colors.accentDark : colors.muted,
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Política y términos"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,24,29,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 110,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "80vh",
          background: "#fff",
          borderRadius: 20,
          padding: "28px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
          borderTop: `4px solid ${colors.accentLight}`,
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="btn-close"
          style={{
            position: "absolute",
            top: 14,
            right: 18,
            cursor: "pointer",
            fontSize: 20,
            color: colors.mutedLight,
            background: "none",
            border: "none",
          }}
        >
          ×
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => onTab("privacidad")}
            className={tab === "privacidad" ? "btn-tab-active" : "btn-tab"}
            style={tabStyle(tab === "privacidad")}
          >
            Política de datos
          </button>
          <button
            type="button"
            onClick={() => onTab("terminos")}
            className={tab === "terminos" ? "btn-tab-active" : "btn-tab"}
            style={tabStyle(tab === "terminos")}
          >
            Términos y condiciones
          </button>
        </div>
        <div style={{ overflowY: "auto", fontSize: 13, lineHeight: 1.7, color: colors.inkSoft, whiteSpace: "pre-wrap" }}>
          {tab === "privacidad" ? policyText : termsText}
        </div>
      </div>
    </div>
  );
}
