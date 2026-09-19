import { getLegalTexts } from "@/lib/queries";
import LandingScreen from "@/components/LandingScreen";

export default async function Home() {
  const legal = await getLegalTexts();
  return <LandingScreen policyText={legal.privacidad} termsText={legal.terminos} />;
}
