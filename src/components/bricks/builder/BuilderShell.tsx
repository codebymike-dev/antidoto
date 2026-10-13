"use client";

import dynamic from "next/dynamic";
import type { BuilderProps } from "./Builder";

// three va en un chunk aparte que solo baja el constructor; sin SSR porque necesita WebGL.
const Builder = dynamic(() => import("./Builder"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#E9EEF1", color: "#0C5C7D", fontFamily: "var(--font-poppins), sans-serif" }}>
      Preparando las piezas…
    </div>
  ),
});

export default function BuilderShell(props: BuilderProps) {
  return <Builder {...props} />;
}
