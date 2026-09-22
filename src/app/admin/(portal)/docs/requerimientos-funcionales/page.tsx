import type { Metadata } from "next";
import { requireSuper } from "@/lib/admin-guard";
import { REQUISITOS_FUNCIONALES } from "@/data/documentacion";
import RequisitosList from "@/components/admin/docs/RequisitosList";

export const metadata: Metadata = { title: "Requerimientos funcionales" };

export default async function RequerimientosFuncionalesPage() {
  await requireSuper();
  return (
    <RequisitosList
      titulo="Requerimientos funcionales"
      subtitulo="Qué hace Antídoto, por módulo. El estado se escribe mirando el código: parcial significa que existe una parte (por ejemplo la API) y falta otra (la pantalla)."
      modulos={REQUISITOS_FUNCIONALES}
    />
  );
}
