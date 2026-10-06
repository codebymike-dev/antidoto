"use client";

import { useEffect } from "react";
import Link from "next/link";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, secondaryButton } from "@/lib/styles";

/**
 * Error dentro del portal: el menú lateral sigue a mano y se puede reintentar o ir a otra
 * sección, en vez de caer en la pantalla de error general de la app.
 */
export default function PortalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert" style={{ ...card, maxWidth: 560, padding: "28px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: colors.danger, letterSpacing: 1 }}>ALGO FALLÓ</span>
      <h1 style={{ ...calSans, fontSize: 24, margin: 0, color: colors.ink, fontWeight: 400 }}>No pudimos cargar esta sección</h1>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: colors.inkSoft }}>
        Puede ser la conexión o un error nuestro. Intenta de nuevo; si sigue pasando, avísanos
        {error.digest ? (
          <>
            {" "}
            con esta referencia: <code style={{ fontSize: 13 }}>{error.digest}</code>
          </>
        ) : null}
        .
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
        <button type="button" onClick={() => retry()} className="btn-filled" style={{ ...filledButton, height: 42 }}>
          Intentar de nuevo
        </button>
        <Link href="/admin" className="btn-secondary" style={{ ...secondaryButton, height: 42, display: "inline-flex", alignItems: "center" }}>
          Ir al inicio del portal
        </Link>
      </div>
    </section>
  );
}
