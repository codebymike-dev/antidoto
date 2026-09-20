"use client";

import { useEffect } from "react";
import Link from "next/link";
import { colors, calSans } from "@/lib/theme";
import { primaryButton, secondaryButton } from "@/lib/styles";
import Blobs from "@/components/Blobs";
import LogoMark from "@/components/LogoMark";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: colors.pageGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "32px 20px",
        textAlign: "center",
      }}
    >
      <Blobs />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <LogoMark height={32} />
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.danger, letterSpacing: 1 }}>ALGO FALLÓ</span>
        <h1 style={{ ...calSans, fontSize: 30, margin: 0, color: colors.ink, maxWidth: 420 }}>
          No pudimos cargar la página
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, margin: 0, maxWidth: 380 }}>
          Ocurrió un error inesperado. Puedes intentarlo de nuevo o volver al inicio.
          {error.digest && <> (ref. {error.digest})</>}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => retry()} className="btn-primary" style={primaryButton}>
            Intentar de nuevo
          </button>
          <Link href="/" className="btn-secondary" style={{ ...secondaryButton, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
