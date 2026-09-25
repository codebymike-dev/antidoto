import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuper } from "@/lib/admin-guard";
import { getCompanyBrand, getCompanyName } from "@/lib/company-brand";
import BrandEditor from "@/components/admin/brand/BrandEditor";
import BrandPageHeader from "@/components/admin/brand/BrandPageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Marca de la empresa" };

export default async function EditarEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuper();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [name, brand] = await Promise.all([getCompanyName(id), getCompanyBrand(id)]);
  if (name === null) notFound();

  return (
    <div>
      <BrandPageHeader
        title={name}
        subtitle={brand ? "Ajusta su logo, colores y mensaje. Los cambios se ven al instante en la vista previa." : "Esta empresa todavía usa la marca de Antídoto. Configura la suya."}
      />
      <BrandEditor
        companyId={id}
        canRename
        cancelHref="/admin/config?tab=companies"
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
