"use client";

import { useState, type ReactNode } from "react";
import { colors } from "@/lib/theme";

/** Muestra las primeras filas y un botón para ver el resto ahí mismo. */
export default function ExpandableList({ visible, hidden, total }: { visible: ReactNode; hidden: ReactNode; total: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {visible}
      {open && hidden}
      <button
        type="button"
        className="btn-text"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ background: "none", border: "none", padding: "12px 0 0", cursor: "pointer", fontSize: 13, fontWeight: 600, color: colors.accent }}
      >
        {open ? "Ver menos" : `Ver los ${total} participantes`}
      </button>
    </>
  );
}
