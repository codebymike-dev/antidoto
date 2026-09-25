import type { Metadata } from "next";
import Link from "next/link";
import { requireSuper } from "@/lib/admin-guard";
import { listCompanies } from "@/lib/queries";
import { EXPERIENCES, getExperience, seriesEntry, seriesFrom } from "@/lib/experiences/catalog";
import { colors, calSans } from "@/lib/theme";
import AssignForm from "@/components/admin/AssignForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Asignar actividad" };

/** Asignar una actividad de la biblioteca a una empresa: crea el código para sus participantes. */
export default async function AsignarPage({ searchParams }: { searchParams: Promise<{ empresa?: string; actividad?: string }> }) {
  await requireSuper();
  const { empresa, actividad } = await searchParams;
  const companies = await listCompanies();

  // Una serie se asigna completa desde su primera estación: una opción por serie.
  const entries = [...new Map(EXPERIENCES.map((e) => [e.series, seriesEntry(e)])).values()];
  const activities = entries.map((e) => {
    const stations = seriesFrom(e);
    return {
      key: e.key,
      scene: e.scene,
      title: e.series,
      detail:
        stations.length > 1
          ? `${stations.length} estaciones, se juegan en orden con el mismo código · ${stations.reduce((s, d) => s + d.risks.length, 0)} riesgos`
          : `${e.risks.length} riesgos · ${e.minutes}`,
    };
  });

  const preCompany = companies.find((c) => String(c.id) === empresa)?.id ?? null;
  const preActivity = actividad ? getExperience(actividad) : null;
  const backHref = preCompany ? `/admin/empresas/${preCompany}` : "/admin/empresas";

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href={backHref} style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
        ‹ Volver
      </Link>
      <h1 style={{ ...calSans, fontSize: 28, margin: "10px 0 6px", color: colors.ink }}>Asignar actividad</h1>
      <p style={{ fontSize: 14, color: colors.muted, margin: "0 0 24px", lineHeight: 1.55 }}>
        Al asignarla se crea un código. Los participantes de la empresa entran con ese código y su avance aparece en la página de la empresa.
      </p>
      <AssignForm
        companies={companies.map((c) => ({ id: c.id, name: c.name }))}
        activities={activities}
        defaultCompany={preCompany}
        defaultActivity={preActivity ? seriesEntry(preActivity).key : (activities[0]?.key ?? null)}
      />
    </div>
  );
}
