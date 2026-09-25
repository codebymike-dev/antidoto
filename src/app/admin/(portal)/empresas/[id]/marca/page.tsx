import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/admin-guard";
import { getCompanyBrand, getCompanyName } from "@/lib/company-brand";
import BrandEditor from "@/components/admin/brand/BrandEditor";
import BrandPageHeader from "@/components/admin/brand/BrandPageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Logo y colores" };

/** Logo, colores y mensaje de bienvenida de una empresa. Su admin solo edita la suya. */
export default async function MarcaEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  if (user.role === "empresa" && user.company_id !== id) notFound();
  const isSuper = user.role === "super";

  const [name, brand] = await Promise.all([getCompanyName(id), getCompanyBrand(id)]);
  if (name === null) notFound();

  return (
    <div>
      <BrandPageHeader
        title={`Logo y colores de ${name}`}
        subtitle={
          brand
            ? "Los participantes los ven en cada actividad, en la pantalla de los juegos en vivo y en los informes PDF. Los cambios se ven al instante en la vista previa."
            : "Todavía usa la marca de Antídoto. Sube su logo y elige sus colores para que los participantes y los informes la muestren."
        }
        back={{ href: `/admin/empresas/${id}`, label: name }}
      />
      <BrandEditor
        companyId={id}
        canRename={isSuper}
        cancelHref={`/admin/empresas/${id}`}
        initial={{
          name,
          primary: brand?.primary ?? null,
          secondary: brand?.secondary ?? null,
          welcome: brand?.welcome ?? null,
          logoUrl: brand?.logoUrl ?? null,
          logoSurface: brand?.logoSurface ?? "claro",
        }}
      />
    </div>
  );
}
