import type { CSSProperties } from "react";
import Link from "next/link";
import { brandCssVars, brandPalette, type PublicBrand } from "@/lib/brand-palette";
import { colors, calSans, LOGO_SRC } from "@/lib/theme";
import { secondaryButton } from "@/lib/styles";
import BrandLogo, { WithAntidoto } from "@/components/BrandLogo";
import PrintButton from "./PrintButton";

// Marco común de los reportes PDF: una hoja A4 con la marca de la empresa. En pantalla se
// ve como una hoja sobre fondo gris con la barra de acciones; al imprimir queda solo la hoja
// (reglas @media print de globals.css).

interface Props {
  brand: PublicBrand | null;
  /** Nombre de la empresa aunque no tenga marca configurada. */
  companyName: string | null;
  kind: string;
  kicker: string;
  title: string;
  subtitle?: string;
  backHref: string;
  children: React.ReactNode;
}

export default function ReportFrame({ brand, companyName, kind, kicker, title, subtitle, backHref, children }: Props) {
  const p = brandPalette(brand);
  const generated = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="report-page" style={{ minHeight: "100vh", background: "#E9EEF0", padding: "24px 16px 48px", ...brandCssVars(p) }}>
      <div className="no-print" style={{ maxWidth: 820, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Link href={backHref} className="btn-secondary" style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}>
          ‹ Volver
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: colors.muted }}>Consejo: activa &quot;Gráficos de fondo&quot; en el diálogo para conservar los colores.</span>
          <PrintButton />
        </div>
      </div>

      <article className="report-sheet" style={{ maxWidth: 820, margin: "0 auto", background: "#fff", borderRadius: 8, boxShadow: "0 18px 50px rgba(15,24,29,0.14)", padding: "44px 48px 36px", display: "flex", flexDirection: "column", gap: 26 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            {brand ? (
              <BrandLogo brand={brand} surface="claro" height={44} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={LOGO_SRC} alt="Antídoto" style={{ height: 40 }} />
            )}
            <div style={{ textAlign: "right", fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, color: colors.ink, textTransform: "uppercase", letterSpacing: 0.8, fontSize: 11 }}>{kind}</div>
              {companyName && <div>{companyName}</div>}
              <div>Generado el {generated}</div>
            </div>
          </div>
          <div aria-hidden style={{ height: 4, borderRadius: 4, background: `linear-gradient(90deg, ${p.graphic}, ${p.soft})` }} />
          <div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: p.accent, letterSpacing: 1.2 }}>{kicker}</span>
            <h1 style={{ ...calSans, fontSize: 30, margin: "4px 0 6px", color: colors.ink, fontWeight: 400, lineHeight: 1.15 }}>{title}</h1>
            {subtitle && <p style={{ margin: 0, fontSize: 13.5, color: colors.inkSoft, lineHeight: 1.6, maxWidth: 620 }}>{subtitle}</p>}
          </div>
        </header>

        {children}

        <footer style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 11, color: colors.muted }}>
          <span>{companyName ? `Reporte preparado para ${companyName}` : "Reporte de Antídoto"}</span>
          {brand ? <WithAntidoto surface="claro" size={16} /> : <span>antidotocolombia.com</span>}
        </footer>
      </article>
    </div>
  );
}

/** Indicadores grandes del reporte, sobre el tinte de la marca. */
export function ReportStats({ brand, items }: { brand: PublicBrand | null; items: { label: string; value: string; hint?: string }[] }) {
  const p = brandPalette(brand);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`, gap: 12 }}>
      {items.map((s) => (
        <div key={s.label} className="avoid-break" style={{ background: p.tint, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: p.strong, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
          <div style={{ ...calSans, fontSize: 28, color: colors.ink, marginTop: 2 }}>{s.value}</div>
          {s.hint && <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}

export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink, fontWeight: 400 }}>{title}</h2>
      {children}
    </section>
  );
}

/** Barra horizontal con porcentaje, en el color de la marca. */
export function ReportBar({ brand, pct, secondary }: { brand: PublicBrand | null; pct: number; secondary?: number }) {
  const p = brandPalette(brand);
  return (
    <div style={{ position: "relative", height: 9, borderRadius: 9, background: p.tint, overflow: "hidden" }}>
      {secondary !== undefined && <div style={{ position: "absolute", inset: 0, width: `${secondary}%`, background: p.soft, borderRadius: 9 }} />}
      <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: p.graphic, borderRadius: 9 }} />
    </div>
  );
}

export const reportTable: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12.5 };
export const reportTh: CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #DCE8EC" };
export const reportTd: CSSProperties = { padding: "8px 10px", color: colors.ink, borderBottom: "1px solid #EEF4F6", verticalAlign: "top" };
