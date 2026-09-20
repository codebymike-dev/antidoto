import { getLegalTexts } from "@/lib/queries";
import LandingScreen from "@/components/LandingScreen";

// Los textos legales se editan desde el portal, así que la landing no se prerenderiza.
export const dynamic = "force-dynamic";

// Si la base no responde, la landing es lo último que debe caerse: es la puerta de
// entrada a la misión. Se sirve igual y solo los textos legales quedan sin contenido.
const LEGAL_NO_DISPONIBLE =
  "No pudimos cargar este texto en este momento. Escríbenos a antidotocolombia.com si necesitas consultarlo.";

async function legalTextsConRespaldo() {
  try {
    return await getLegalTexts();
  } catch (error) {
    console.error("[landing] no se pudieron leer los textos legales:", error);
    return { privacidad: LEGAL_NO_DISPONIBLE, terminos: LEGAL_NO_DISPONIBLE };
  }
}

export default async function Home() {
  const legal = await legalTextsConRespaldo();
  return <LandingScreen policyText={legal.privacidad} termsText={legal.terminos} />;
}
