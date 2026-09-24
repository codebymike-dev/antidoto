import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getExperience } from "@/lib/experiences/catalog";
import { loadOverrides } from "@/lib/experience-data";
import { publicExperience, riskTexts } from "@/lib/experiences/texts";
import ExperiencePlayer from "@/components/experience/ExperiencePlayer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vista previa de la escena",
  robots: { index: false, follow: false },
};

// Fuera del layout del portal a propósito: la escena se prueba a pantalla completa, como
// la ve el participante. Nada se guarda: califica en el navegador con los textos vigentes.
export default async function EscenaPreviewPage({ params }: { params: Promise<{ key: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  const { key } = await params;
  const def = getExperience(key);
  if (!def) notFound();

  const overrides = await loadOverrides(def.key);
  const previewTexts = Object.fromEntries(def.risks.map((r) => [r.id, riskTexts(r, overrides)]));

  return (
    <ExperiencePlayer
      experience={publicExperience(def, overrides)}
      participant={user.username}
      initialResults={[]}
      mode="preview"
      previewTexts={previewTexts}
      exitHref="/admin/biblioteca"
    />
  );
}
