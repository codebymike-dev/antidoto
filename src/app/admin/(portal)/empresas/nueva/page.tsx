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
        subtitle="Escribe su nombre y elige su color principal (el logo es opcional). Después de guardar podrás asignarle actividades."
        back={{ href: "/admin/empresas", label: "Empresas" }}
      />
      <BrandEditor
        companyId={null}
        canRename
        cancelHref="/admin/empresas"
        initial={{ name: "", primary: null, secondary: null, welcome: null, logoUrl: null, logoSurface: "claro" }}
      />
    </div>
  );
}
