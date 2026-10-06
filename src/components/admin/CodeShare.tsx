"use client";

import { useState, type ReactNode } from "react";
import { colors, calSans } from "@/lib/theme";
import { secondaryButton } from "@/lib/styles";
import QrCode from "@/components/live/QrCode";

interface Props {
  code: string;
  /** Enlace con el código ya puesto (`/?codigo=...`). */
  joinUrl: string;
  /** Dominio para quien prefiera escribir el código a mano. */
  host: string;
  activity: string;
  company: string;
  /** Sin esto (código cerrado o empresa archivada) la fila se muestra sin "Compartir". */
  shareable: boolean;
  /** El código y su estado, a la izquierda de la fila. */
  children: ReactNode;
  /** Acciones de la derecha (el menú de opciones), junto a "Compartir". */
  actions?: ReactNode;
}

/**
 * Cómo se comparte un código de actividad: el enlace con el código adentro, el QR para
 * proyectarlo o imprimirlo, y un mensaje listo para pegar en el chat del equipo.
 */
export default function CodeShare({ code, joinUrl, host, activity, company, shareable, children, actions }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "message" | "failed" | null>(null);

  const message =
    `Hola. Ya está abierta la actividad "${activity}" de ${company}. Entra desde tu celular con este enlace: ${joinUrl}\n` +
    `Si no abre, ve a ${host} y escribe el código ${code}.`;

  // El portapapeles falla fuera de HTTPS o sin permiso: el enlace queda seleccionable a mano.
  async function copy(what: "link" | "message") {
    try {
      await navigator.clipboard.writeText(what === "link" ? joinUrl : message);
      setCopied(what);
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 2500);
    } catch {
      setCopied("failed");
    }
  }

  const small = { ...secondaryButton, height: 36, fontSize: 13, display: "inline-flex", alignItems: "center", textDecoration: "none" };

  return (
    <div style={{ padding: "10px 0 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        {children}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {shareable && (
            <button
              type="button"
              className="btn-secondary"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              style={{ ...secondaryButton, height: 34, fontSize: 13 }}
            >
              {open ? "Ocultar" : "Compartir"}
            </button>
          )}
          {actions}
        </div>
      </div>
      {shareable && open && (
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", padding: "14px 0 4px" }}>
          <QrCode value={joinUrl} size={132} label={`Código QR para entrar con el código ${code}`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 300px", minWidth: 0 }}>
            <span style={{ ...calSans, fontSize: 16, color: colors.ink }}>Enlace para entrar</span>
            <span style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>
              Abre la entrada con el código ya puesto: cada persona solo escribe su nombre. El QR sirve para proyectarlo en una
              reunión o imprimirlo.
            </span>
            <code
              title={joinUrl}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                background: colors.accentTint,
                color: colors.accentDark,
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                userSelect: "all",
              }}
            >
              {joinUrl}
            </code>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-live="polite">
              <button type="button" className="btn-secondary" style={small} onClick={() => copy("link")}>
                {copied === "link" ? "¡Enlace copiado!" : "Copiar enlace"}
              </button>
              <button type="button" className="btn-secondary" style={small} onClick={() => copy("message")}>
                {copied === "message" ? "¡Mensaje copiado!" : "Copiar mensaje"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={small}
              >
                Enviar por WhatsApp
              </a>
            </div>
            {copied === "failed" && (
              <span style={{ fontSize: 12.5, color: colors.muted }}>No se pudo copiar solo: selecciona el enlace y cópialo a mano.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
