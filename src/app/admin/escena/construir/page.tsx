import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import BuilderShell from "@/components/bricks/builder/BuilderShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bricks Serious Play · construcción libre",
  robots: { index: false, follow: false },
};

// Vista previa del constructor a pantalla completa, fuera del layout del portal, como la verá
// el participante. Nada se guarda todavía (la persistencia llega en la fase 5).
export default async function ConstruirPreviewPage() {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  return <BuilderShell title="Construcción libre" exitHref="/admin/biblioteca" />;
}
