import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { IBM_Plex_Mono, Poppins } from "next/font/google";
import { colors } from "@/lib/theme";
import "./globals.css";
import "./motion.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Solo para las celdas split-flap del "pase de misión": cada carácter mide lo mismo (1ch),
// así las celdas dibujadas detrás de un <input> calzan con lo que se escribe.
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["600"],
});

const SITE_URL = "https://antidotocolombia.vercel.app";
const SITE_TITLE = "Antídoto · Misiones interactivas";
const SITE_DESCRIPTION =
  "Únete a la misión interactiva de tu equipo con el código de tu actividad.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Antídoto",
  },
  description: SITE_DESCRIPTION,
  keywords: ["misiones interactivas", "trivia en equipo", "dinámicas para equipos", "Antídoto"],
  authors: [{ name: "Antídoto", url: "https://antidotocolombia.com" }],
  creator: "Antídoto",
  publisher: "Antídoto",
  category: "entertainment",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_TITLE,
  },
};

export const viewport: Viewport = {
  themeColor: colors.accent,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${poppins.variable} ${plexMono.variable} h-full`}>
      <body className="h-full">
        <ViewTransition>{children}</ViewTransition>
      </body>
    </html>
  );
}
