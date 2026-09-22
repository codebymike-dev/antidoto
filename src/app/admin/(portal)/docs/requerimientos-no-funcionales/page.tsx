import type { Metadata } from "next";
import { requireSuper } from "@/lib/admin-guard";
import { REQUISITOS_NO_FUNCIONALES } from "@/data/documentacion";
import RequisitosList from "@/components/admin/docs/RequisitosList";

export const metadata: Metadata = { title: "Requerimientos no funcionales" };

export default async function RequerimientosNoFuncionalesPage() {
  await requireSuper();
  return (
    <RequisitosList
      titulo="Requerimientos no funcionales"
      subtitulo="Cómo debe comportarse el sistema, agrupado por las características de calidad de ISO/IEC 25010, con la restricción de funcionar solo en capas gratuitas."
      modulos={REQUISITOS_NO_FUNCIONALES}
    />
  );
}
