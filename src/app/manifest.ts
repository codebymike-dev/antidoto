import type { MetadataRoute } from "next";
import { colors } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Antídoto · Pausas activas",
    short_name: "Antídoto",
    description: "Misiones interactivas de pausas activas para equipos.",
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
    ],
  };
}
