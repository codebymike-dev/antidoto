"use client";

import type { CSSProperties, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { showToast } from "./toast";

interface Props {
  action: (formData: FormData) => Promise<void>;
  /** Lo que se dice al terminar bien, con nombres concretos ("el código X quedó pausado"). */
  notice: string;
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * Formulario del portal que avisa al terminar. La acción del servidor revalida la página
 * sola; este envoltorio solo añade el aviso flotante, sin recargar ni mover el scroll.
 */
export default function ActionForm({ action, notice, children, style }: Props) {
  return (
    <form
      style={style}
      action={async (formData) => {
        try {
          await action(formData);
          showToast(notice);
        } catch {
          showToast("No se pudo guardar. Revisa tu conexión y vuelve a intentarlo.", "error");
        }
      }}
    >
      {children}
    </form>
  );
}

/** Botón de enviar que dice "Guardando…" mientras la acción corre. */
export function PendingButton({ children, pendingLabel = "Guardando…", className, style }: { children: ReactNode; pendingLabel?: string; className?: string; style?: CSSProperties }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className} style={{ ...style, opacity: pending ? 0.7 : 1 }}>
      {pending ? pendingLabel : children}
    </button>
  );
}
