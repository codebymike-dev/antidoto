"use client";

import dynamic from "next/dynamic";

// three y R3F van en un chunk aparte que solo baja esta ruta; sin SSR porque necesitan WebGL.
const BrickLab = dynamic(() => import("./BrickLab"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#16222A", color: "#80DCFF" }}>
      Cargando el motor 3D…
    </div>
  ),
});

export default function LabShell() {
  return <BrickLab />;
}
