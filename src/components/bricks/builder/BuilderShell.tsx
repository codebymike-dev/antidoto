"use client";

import dynamic from "next/dynamic";

// three va en un chunk aparte que solo baja el constructor; sin SSR porque necesita WebGL.
const Builder = dynamic(() => import("./Builder"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#16222A", color: "#80DCFF", fontFamily: "var(--font-poppins), sans-serif" }}>
      Preparando las piezas…
    </div>
  ),
});

export default function BuilderShell(props: { title: string; exitHref: string }) {
  return <Builder {...props} />;
}
