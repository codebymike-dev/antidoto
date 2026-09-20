import Link from "next/link";
import { colors, calSans } from "@/lib/theme";
import { primaryButton } from "@/lib/styles";
import Blobs from "@/components/Blobs";
import LogoMark from "@/components/LogoMark";

export default function NotFound() {
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
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.accent, letterSpacing: 1 }}>ERROR 404</span>
        <h1 style={{ ...calSans, fontSize: 30, margin: 0, color: colors.ink, maxWidth: 420 }}>
          No encontramos esta página
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, margin: 0, maxWidth: 380 }}>
          Puede que el enlace esté vencido o mal escrito. Verifica la dirección o vuelve al inicio.
        </p>
        <Link href="/" className="btn-primary" style={{ ...primaryButton, display: "inline-flex", alignItems: "center", padding: "0 24px", textDecoration: "none" }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
