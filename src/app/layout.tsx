import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = "https://antidotocolombia.vercel.app";
const SITE_TITLE = "Antídoto · Pausas activas";
const SITE_DESCRIPTION =
  "Únete a la misión interactiva de pausas activas de tu equipo con el código de tu actividad.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Antídoto",
  },
  description: SITE_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: SITE_URL,
    siteName: "Antídoto",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${poppins.variable} h-full`}>
      <body className="h-full">
        <ViewTransition>{children}</ViewTransition>
      </body>
    </html>
  );
}
