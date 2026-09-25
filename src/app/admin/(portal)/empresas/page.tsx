import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listCompaniesWithBrand } from "@/lib/company-brand";
import { restoreCompany } from "@/lib/actions";
import { brandPalette } from "@/lib/brand-palette";
import { colors, calSans } from "@/lib/theme";
import { filledButton, secondaryButton, tabButton, tabButtonActive } from "@/lib/styles";
import BrandLogo from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

export default async function EmpresasPage({ searchParams }: { searchParams: Promise<{ archivadas?: string }> }) {
  const user = (await currentUser())!;
  // El admin de empresa no ve la lista: va directo a la suya.
  if (user.role === "empresa") redirect(`/admin/empresas/${user.company_id}`);

  const archived = (await searchParams).archivadas === "1";
  const [companies, archivedCount] = await Promise.all([
    listCompaniesWithBrand(archived),
    archived ? Promise.resolve(null) : listCompaniesWithBrand(true).then((c) => c.length),
  ]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Empresas</h1>
          <p style={{ fontSize: 14, color: colors.muted, margin: 0, maxWidth: 560, lineHeight: 1.5 }}>
            Entra a una empresa para asignarle actividades, ver cómo va cada una y descargar su informe.
          </p>
        </div>
        <Link href="/admin/empresas/nueva" className="btn-filled" style={{ ...filledButton, display: "inline-flex", alignItems: "center" }}>
          ＋ Nueva empresa
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Activas", on: !archived, href: "/admin/empresas" },
          { label: archivedCount ? `Archivadas (${archivedCount})` : "Archivadas", on: archived, href: "/admin/empresas?archivadas=1" },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={t.on ? "btn-tab-active" : "btn-tab"}
            style={{ ...(t.on ? tabButtonActive : tabButton), color: t.on ? colors.accentDark : colors.muted }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {companies.length === 0 && (
        <p style={{ fontSize: 14, color: colors.muted, margin: "32px 0", textAlign: "center" }}>
          {archived ? "No hay empresas archivadas." : "Todavía no hay empresas. Crea la primera con “Nueva empresa”."}
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
        {companies.map((c) => {
          const p = brandPalette(c.brand);
          const dark = !!c.brand?.logoUrl && c.brand.logoSurface === "oscuro";
          const brand = c.brand ?? { name: c.name, primary: colors.accent, secondary: null, logoUrl: null, logoSurface: "claro" as const };
          const summary =
            c.activities === 0
              ? "Sin actividades"
              : `${c.activities} ${c.activities === 1 ? "actividad" : "actividades"} · ${c.participantes} ${c.participantes === 1 ? "participante" : "participantes"}`;
          return (
            <li key={c.id} className="company-card" style={{ background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: colors.cardShadowSmall, display: "flex", flexDirection: "column" }}>
              <Link href={`/admin/empresas/${c.id}`} style={{ display: "flex", flexDirection: "column", color: "inherit", textDecoration: "none", flex: 1 }}>
                <div
                  style={{
                    height: 96,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 20px",
                    background: c.brand ? (dark ? colors.ink : p.pageGradient) : "#F4F8FA",
                    opacity: archived ? 0.6 : 1,
                  }}
                >
                  <BrandLogo brand={brand} surface={dark ? "oscuro" : "claro"} height={42} showName={false} />
                </div>
                <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  <span style={{ fontSize: 12.5, color: colors.muted }}>{summary}</span>
                </div>
              </Link>
              {archived && (
                <form action={restoreCompany} style={{ padding: "0 16px 16px" }}>
                  <input type="hidden" name="companyId" value={c.id} />
                  <button type="submit" className="btn-secondary" style={{ ...secondaryButton, height: 36, width: "100%" }}>
                    Restaurar
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
