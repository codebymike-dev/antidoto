"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { colors, calSans } from "@/lib/theme";
import { primaryButton } from "@/lib/styles";

interface Props {
  action: () => Promise<void>;
  /** Contenido del botón que abre la confirmación. */
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  title: string;
  body: ReactNode;
  confirmLabel: string;
}

/**
 * Botón que borra la sesión del participante en este dispositivo, pero solo después de
 * confirmar. Usa <dialog> nativo: atrapa el foco, cierra con Escape y lo devuelve al botón.
 */
export default function LeaveConfirm({ action, children, className, style, title, body, confirmLabel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className={className} style={style} onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="leave-confirm-title"
        // Tocar fuera de la ventana (el ::backdrop) también cierra.
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
        style={{
          border: "none",
          borderRadius: 18,
          padding: 0,
          // El reset global quita el margin auto con el que el navegador centra el <dialog>.
          margin: "auto",
          maxWidth: 400,
          width: "calc(100% - 40px)",
          boxShadow: colors.cardShadowSmall,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px 22px", textAlign: "left" }}>
          <h2 id="leave-confirm-title" style={{ ...calSans, fontSize: 21, margin: 0, color: colors.ink }}>
            {title}
          </h2>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: colors.inkSoft }}>{body}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <button
              type="button"
              autoFocus
              className="btn-primary"
              style={{ ...primaryButton, marginTop: 0, height: 46, padding: "0 22px", fontSize: 14.5 }}
              onClick={() => ref.current?.close()}
            >
              Me quedo
            </button>
            <form action={action}>
              <button
                type="submit"
                className="btn-text"
                style={{
                  height: 46,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  background: "#fff",
                  color: colors.inkSoft,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {confirmLabel}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
