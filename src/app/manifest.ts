import type { MetadataRoute } from "next";
import { colors } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Antídoto · Misiones interactivas",
    short_name: "Antídoto",
    description: "Misiones interactivas para equipos.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: colors.accent,
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/pwa-icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
