import type { Metadata } from "next";
import { requireSuper } from "@/lib/admin-guard";
import BrandEditor from "@/components/admin/brand/BrandEditor";
import BrandPageHeader from "@/components/admin/brand/BrandPageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nueva empresa" };

export default async function NuevaEmpresaPage() {
  await requireSuper();

  return (
    <div>
      <BrandPageHeader
        title="Nueva empresa"
        subtitle="Dale su identidad: los participantes, el proyector y los reportes la verán con su logo y sus colores."
      />
      <BrandEditor
        companyId={null}
        canRename
        cancelHref="/admin/config?tab=companies"
        initial={{ name: "", primary: null, secondary: null, welcome: null, logoUrl: null, logoSurface: "claro" }}
      />
    </div>
  );
}
