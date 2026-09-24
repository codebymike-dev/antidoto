import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getExperience, seriesFrom } from "@/lib/experiences/catalog";
import { loadAllOverrides, stationRisks } from "@/lib/experience-data";
import { publicExperience, riskTexts } from "@/lib/experiences/texts";
import ExperiencePlayer from "@/components/experience/ExperiencePlayer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vista previa de la escena",
  robots: { index: false, follow: false },
};

// Fuera del layout del portal a propósito: la escena se prueba a pantalla completa, como
// la ve el participante. Nada se guarda: califica en el navegador con los textos vigentes.
// Arranca en la estación pedida y sigue con las siguientes de la serie, como en el juego.
export default async function EscenaPreviewPage({ params }: { params: Promise<{ key: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  const { key } = await params;
  const def = getExperience(key);
  if (!def) notFound();

  const stations = seriesFrom(def);
  const overrides = await loadAllOverrides(stations);
  const previewTexts = Object.fromEntries(
    stationRisks(stations).map(({ def: d, risk }) => [risk.id, riskTexts(risk, overrides.get(d.key)!)]),
  );

  return (
    <ExperiencePlayer
      stations={stations.map((d) => publicExperience(d, overrides.get(d.key)!))}
      participant={user.username}
      initialResults={[]}
      mode="preview"
      previewTexts={previewTexts}
      exitHref="/admin/biblioteca"
    />
  );
}
