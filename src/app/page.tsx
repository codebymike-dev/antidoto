import type { Metadata } from "next";
import { getLegalTexts } from "@/lib/queries";
import LandingScreen from "@/components/LandingScreen";
import PassBackdrop from "@/components/motion/PassBackdrop";

// Los textos legales se editan desde el portal, así que la landing no se prerenderiza.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://antidotocolombia.vercel.app/#organization",
      name: "Antídoto",
      url: "https://antidotocolombia.com",
      logo: "https://antidotocolombia.com/antidoto.svg",
    },
    {
      "@type": "WebSite",
      "@id": "https://antidotocolombia.vercel.app/#website",
      name: "Antídoto · Misiones interactivas",
      url: "https://antidotocolombia.vercel.app",
      description: "Únete a la misión interactiva de tu equipo con el código de tu actividad.",
      publisher: { "@id": "https://antidotocolombia.vercel.app/#organization" },
      inLanguage: "es-CO",
    },
  ],
};

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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingScreen policyText={legal.privacidad} termsText={legal.terminos} backdrop={<PassBackdrop />} />
    </>
  );
}
