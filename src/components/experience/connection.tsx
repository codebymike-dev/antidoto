"use client";

import { useSyncExternalStore } from "react";
import styles from "./player.module.css";

/** Lo que dice el navegador sobre la conexión. Puede equivocarse a favor de "hay red", nunca al revés. */
function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Aviso fijo arriba mientras no haya conexión: el avance ya guardado no se pierde. */
export function ConnectionBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className={styles.offlineBanner}>
      Sin conexión. Lo que ya respondiste está guardado. Para responder necesitas recuperar la señal.
    </div>
  );
}

/** Mensaje para cuando una petición no llegó (cortada o muy lenta). */
export function networkMessage(what: string): string {
  return typeof navigator !== "undefined" && !navigator.onLine
    ? `Sin conexión. ${what}`
    : `No pudimos conectar con el servidor. ${what}`;
}
