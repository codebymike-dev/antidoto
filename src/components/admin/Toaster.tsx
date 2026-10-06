"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { colors } from "@/lib/theme";
import { dismissToast, showToast, subscribeToast, toastSnapshot } from "./toast";

/**
 * Avisos que llegan por la URL: las acciones que redirigen a otra página (archivar una
 * empresa) no pueden avisar desde el formulario, así que dejan `?aviso=` en el destino.
 */
const URL_NOTICES: Record<string, string> = {
  "empresa-archivada": "Listo: la empresa quedó archivada. Sus códigos dejan de funcionar; la encuentras en Archivadas.",
  "empresa-restaurada": "Listo: la empresa está activa otra vez y sus códigos vuelven a funcionar.",
};

const HIDE_MS = 4500;

/** El aviso flotante del portal, abajo a la derecha. Uno a la vez: el nuevo reemplaza al anterior. */
export default function Toaster() {
  const toast = useSyncExternalStore(subscribeToast, toastSnapshot, () => null);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const aviso = params.get("aviso");

  useEffect(() => {
    if (!aviso) return;
    if (URL_NOTICES[aviso]) showToast(URL_NOTICES[aviso]);
    // Se quita de la URL para que recargar no repita el aviso.
    const rest = new URLSearchParams(params);
    rest.delete("aviso");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [aviso, params, pathname, router]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => dismissToast(toast.id), toast.tone === "error" ? HIDE_MS * 2 : HIDE_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const error = toast?.tone === "error";
  return (
    // La región existe siempre: un lector de pantalla solo anuncia cambios en regiones ya montadas.
    <div role="status" aria-live="polite" style={{ position: "fixed", right: 24, bottom: 24, zIndex: 50, maxWidth: "min(420px, calc(100vw - 48px))" }}>
      {toast && (
        <div
          key={toast.id}
          className="toast-in"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px 14px 12px 16px",
            borderRadius: 12,
            background: error ? "#FCE4E1" : "#EAF7EE",
            color: error ? "#8E2A1F" : "#1E6B3A",
            fontSize: 13.5,
            fontWeight: 600,
            lineHeight: 1.5,
            boxShadow: colors.cardShadow,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 20,
              height: 20,
              flexShrink: 0,
              marginTop: 1,
              borderRadius: 999,
              background: error ? colors.danger : "#2E9B57",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            {error ? "!" : "✓"}
          </span>
          <span style={{ flex: 1 }}>{toast.text}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Cerrar aviso"
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 14, padding: "0 2px", lineHeight: 1.4 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
