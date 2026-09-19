import { getLegalTexts } from "@/lib/queries";
import LandingScreen from "@/components/LandingScreen";

// Los textos legales se editan desde el portal, así que la landing no se prerenderiza.
export const dynamic = "force-dynamic";

export default async function Home() {
  const legal = await getLegalTexts();
  return <LandingScreen policyText={legal.privacidad} termsText={legal.terminos} />;
}
