import type { Metadata } from "next";
import { colors } from "@/lib/theme";
import ProbePlayer from "@/components/live-probe/ProbePlayer";

// Fase 0 (prueba técnica de tiempo real). Se borra cuando exista el módulo en vivo.

export const metadata: Metadata = {
  title: "Prueba en vivo",
  robots: { index: false, follow: false },
};

export default function PruebaVivoPage() {
  return (
    <div style={{ minHeight: "100vh", background: colors.pageGradient, padding: "32px 16px" }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <ProbePlayer />
      </div>
    </div>
  );
}
