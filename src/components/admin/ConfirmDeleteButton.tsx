"use client";

import { useRef, useState } from "react";
import { colors } from "@/lib/theme";

export default function ConfirmDeleteButton({ children }: { children: string }) {
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!confirming) {
      e.preventDefault();
      setConfirming(true);
      timeoutRef.current = setTimeout(() => setConfirming(false), 3000);
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }

  return (
    <button
      type="submit"
      className="btn-danger"
      onClick={handleClick}
      style={{
        cursor: "pointer",
        fontSize: 12.5,
        fontWeight: 600,
        background: confirming ? colors.danger : "none",
        color: confirming ? "#fff" : colors.danger,
        border: "none",
        borderRadius: 8,
        padding: confirming ? "6px 12px" : 0,
      }}
    >
      {confirming ? "¿Confirmar?" : children}
    </button>
  );
}
