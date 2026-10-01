"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./player.module.css";
import { completeExperience } from "@/lib/experience-actions";
import { withTimeout } from "@/lib/with-timeout";
import { networkMessage } from "./connection";

/**
 * "Terminar la ruta". Si no hay señal avisa y deja reintentar, en vez de dejar al
 * participante frente a un error de la aplicación justo en el último paso.
 */
export default function FinishRouteButton({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const out = await withTimeout(completeExperience(), 20000);
      // "done": la primera petición sí llegó y solo se perdió la respuesta.
      if (out.ok || out.reason === "done") {
        router.push("/mision/completada");
        return;
      }
      setError(out.error);
    } catch {
      setError(networkMessage("Tus respuestas están guardadas: inténtalo de nuevo."));
    }
    setPending(false);
  }

  return (
    <>
      <button type="button" autoFocus={autoFocus} className={`${styles.button} ${styles.go}`} style={{ width: "100%" }} onClick={finish} disabled={pending}>
        {pending ? "Guardando..." : "Terminar la ruta"}
      </button>
      {error && (
        <p role="alert" className={styles.netError}>
          {error}
        </p>
      )}
    </>
  );
}
