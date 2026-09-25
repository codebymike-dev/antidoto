"use client";

import { filledButton } from "@/lib/styles";

/** Abre el diálogo de impresión, desde donde se guarda como PDF. */
export default function PrintButton() {
  return (
    <button type="button" className="btn-filled" onClick={() => window.print()} style={{ ...filledButton, display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
        <path d="M6 14h12v7H6z" />
      </svg>
      Guardar como PDF
    </button>
  );
}
