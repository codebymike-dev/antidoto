"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type HostScreenType from "./HostScreen";

// three va en un chunk aparte y sin SSR: la pantalla necesita WebGL.
const HostScreen = dynamic(() => import("./HostScreen"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#16222A", color: "#80DCFF", fontFamily: "var(--font-poppins), sans-serif" }}>
      Preparando la sala…
    </div>
  ),
});

export default function HostShell(props: ComponentProps<typeof HostScreenType>) {
  return <HostScreen {...props} />;
}
