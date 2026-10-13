import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { buildTexts, getBuild, publicBuild } from "@/lib/bricks/challenges";
import { loadBuildOverride } from "@/lib/build-data";
import BuilderShell from "@/components/bricks/builder/BuilderShell";
import { BRICKS_VISIBLE } from "@/lib/bricks/visible";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bricks Serious Play · prueba",
  robots: { index: false, follow: false },
};

// Vista previa del constructor a pantalla completa, fuera del layout del portal, como la verá
// el participante. Con ?reto= se prueba un reto de la biblioteca con sus textos vigentes; nada
// de lo que se construye aquí se guarda.
export default async function ConstruirPreviewPage({ searchParams }: { searchParams: Promise<{ reto?: string }> }) {
  if (!BRICKS_VISIBLE) notFound();
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const { reto } = await searchParams;
  const def = reto ? getBuild(reto) : null;
  if (!def) return <BuilderShell title="Construcción libre" exitHref="/admin/biblioteca" />;

  const texts = buildTexts(def, await loadBuildOverride(def.key));
  return (
    <BuilderShell
      title={texts.title}
      exitHref={`/admin/biblioteca/construccion/${def.key}`}
      challenge={publicBuild(def, texts)}
      session={{
        mode: "preview",
        participant: null,
        company: null,
        welcome: null,
        paused: false,
        started: false,
        elapsedMs: 0,
        profile: null,
        onboarded: true,
      }}
    />
  );
}
