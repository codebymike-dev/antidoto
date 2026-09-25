"use client";

import { useState } from "react";
import { colors } from "@/lib/theme";
import { CheckIcon, CopyIcon } from "@/components/icons";

/** El código de actividad en grande, con un botón para copiarlo y compartirlo. */
export default function CopyCode({ code, size = 15 }: { code: string; size?: number }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin permiso de portapapeles el código sigue visible para copiarlo a mano.
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: size, fontWeight: 700, color: colors.ink, letterSpacing: 0.5 }}>
        {code}
      </span>
      <button
        type="button"
        onClick={copy}
        className="btn-icon"
        aria-label={copied ? "Código copiado" : `Copiar el código ${code}`}
        title={copied ? "Copiado" : "Copiar código"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 28,
          padding: "0 9px",
          borderRadius: 8,
          border: `1px solid ${copied ? "#BFE8CF" : colors.border}`,
          background: copied ? "#E0F7EA" : "#fff",
          color: copied ? "#1F8A4C" : colors.muted,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </span>
  );
}
