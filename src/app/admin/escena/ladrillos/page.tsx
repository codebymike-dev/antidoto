import type { Metadata } from "next";
import { requireSuper } from "@/lib/admin-guard";
import LabShell from "@/components/bricks/lab/LabShell";
import { notFound } from "next/navigation";
import { BRICKS_VISIBLE } from "@/lib/bricks/visible";

export const metadata: Metadata = {
  title: "Banco de pruebas de ladrillos",
  robots: { index: false, follow: false },
};

// Fuera del layout del portal, a pantalla completa como la escena del participante.
// Solo super: es una herramienta de medición, no algo que vea un admin de empresa.
export default async function LadrillosLabPage() {
  if (!BRICKS_VISIBLE) notFound();
  await requireSuper();
  return <LabShell />;
}
