"use client";

import { useState } from "react";
import { colors } from "@/lib/theme";
import { secondaryButton } from "@/lib/styles";
import CopyCode from "@/components/admin/CopyCode";

/**
 * Usuario y contraseña recién generados. La contraseña no se guarda en claro en ningún
 * lado: si se cierra esta caja sin copiarla, toca generar otra.
 */
export default function Credentials({ username, password, loginUrl }: { username: string; password: string; loginUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    const message = [
      "Este es tu acceso al portal de Antídoto:",
      `Entra en ${loginUrl}`,
      `Usuario: ${username}`,
      `Contraseña: ${password}`,
      "Cuando entres, cámbiala en Mi cuenta.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin portapapeles, los datos siguen a la vista para copiarlos a mano.
    }
  }

  return (
    <div role="status" style={{ borderRadius: 14, background: "#EAF7EE", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1E6B3A" }}>Listo. Envíale estos datos a la persona:</div>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", alignItems: "center" }}>
        <dt style={term}>Usuario</dt>
        <dd style={{ margin: 0 }}>
          <CopyCode code={username} label="Copiar el usuario" />
        </dd>
        <dt style={term}>Contraseña</dt>
        <dd style={{ margin: 0 }}>
          <CopyCode code={password} label="Copiar la contraseña" />
        </dd>
        <dt style={term}>Entra en</dt>
        <dd style={{ margin: 0, fontSize: 13.5, color: colors.ink, wordBreak: "break-all" }}>{loginUrl}</dd>
      </dl>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={copyMessage} className="btn-secondary" style={{ ...secondaryButton, height: 36 }}>
          {copied ? "Mensaje copiado" : "Copiar mensaje para enviar"}
        </button>
        <span style={{ fontSize: 12, color: "#2F6B45", lineHeight: 1.45 }}>
          Cópiala ahora: no se vuelve a mostrar. Si se pierde, genera otra.
        </span>
      </div>
    </div>
  );
}

const term = { fontSize: 12, fontWeight: 600, color: "#2F6B45" } as const;
