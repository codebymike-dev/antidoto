"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import styles from "./player.module.css";
import PixelIcon from "./PixelIcon";
import ModalWindow from "./ModalWindow";
import { sceneSound } from "./sound";
import { LOGO_SRC } from "@/lib/theme";
import { CoBrand } from "@/components/BrandLogo";
import type { PublicBrand } from "@/lib/brand-palette";

interface Props {
  brand?: PublicBrand | null;
  title: string;
  sub: string;
  grains: number;
  found: number;
  total: number;
  /** Resalta el monedero (la bienvenida explica los granos). */
  spotPurse?: boolean;
  /** Volver al mapa de la ruta; sin él no se muestra el botón. */
  onMap?: () => void;
  /** Actividad de una sola estación: el mapa no se llama "ruta". */
  single?: boolean;
  exitAction?: () => Promise<void>;
  exitHref?: string;
}

/** Barra de la sala, como en Habbo: marca, dónde estás, monedero, sonido y salida. */
export default function TopBar({ brand, title, sub, grains, found, total, spotPurse, onMap, single, exitAction, exitHref }: Props) {
  const muted = useSyncExternalStore(
    sceneSound().subscribe,
    () => sceneSound().muted,
    () => false,
  );
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    if (!confirmExit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmExit(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmExit]);

  function toggleSound() {
    const next = !muted;
    sceneSound().setMuted(next);
    if (!next) {
      sceneSound().unlock();
      sceneSound().play("ok");
    }
  }

  return (
    <header className={styles.topbar}>
      {brand ? (
        <CoBrand brand={brand} surface="oscuro" height={30} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={LOGO_SRC} alt="Antídoto" className={styles.logo} />
      )}
      <div className={styles.roomInfo}>
        <span className={styles.roomDot} aria-hidden />
        <div style={{ minWidth: 0 }}>
          <div className={styles.roomName}>{title}</div>
          <div className={styles.roomSub}>{sub}</div>
        </div>
      </div>
      <div className={styles.spacer} />
      <div
        className={`${styles.purse} ${spotPurse ? styles.spot : ""}`}
        aria-label={`${grains} granos de café, ${found} de ${total} riesgos`}
      >
        <span className={styles.purseItem} title="Granos de café">
          <PixelIcon name="grano" size={18} />
          <span key={grains} className={grains > 0 ? styles.purseBump : undefined}>
            {grains}
          </span>
        </span>
        <span className={styles.purseItem} title="Riesgos encontrados">
          <PixelIcon name="riesgo" size={18} />
          {found}/{total}
        </span>
      </div>
      {onMap && (
        <button type="button" className={styles.iconButton} onClick={onMap} aria-label={single ? "Ver el mapa" : "Ver el mapa de la ruta"}>
          <PixelIcon name="mapa" size={16} /> <span className={styles.exitLabel}>{single ? "Mapa" : "Ruta"}</span>
        </button>
      )}
      <button type="button" className={styles.iconButton} onClick={toggleSound} aria-label={muted ? "Activar sonido" : "Silenciar"}>
        <PixelIcon name={muted ? "mudo" : "sonido"} size={18} />
      </button>
      {exitAction ? (
        <button type="button" className={styles.iconButton} onClick={() => setConfirmExit(true)} aria-label="Salir">
          <PixelIcon name="puerta" size={14} /> <span className={styles.exitLabel}>Salir</span>
        </button>
      ) : exitHref ? (
        <Link href={exitHref} className={styles.iconButton} aria-label="Salir">
          <PixelIcon name="puerta" size={14} /> <span className={styles.exitLabel}>Salir</span>
        </Link>
      ) : null}

      {confirmExit && exitAction && (
        <>
          <div className={styles.dimFixed} onClick={() => setConfirmExit(false)} />
          <ModalWindow className={`${styles.window} ${styles.dialogFixed}`} role="dialog" aria-labelledby="xp-exit-title">
            <div className={`${styles.winHead} ${styles.winHeadWarn}`}>
              <span className={styles.winTitle} id="xp-exit-title">
                ¿Salir de la ruta?
              </span>
              <button type="button" className={styles.close} onClick={() => setConfirmExit(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <div className={styles.winBody}>
              <p>
                <b>Si solo quieres descansar, cierra esta pestaña.</b> Tu avance queda guardado y al volver en este dispositivo sigues donde
                ibas.
              </p>
              <p className={styles.muted}>
                Si sales, este dispositivo olvida tu sesión. Tu avance no se pierde: entra con tu mismo nombre y código y sigues donde
                ibas.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" autoFocus className={`${styles.button} ${styles.primary}`} onClick={() => setConfirmExit(false)}>
                  Me quedo
                </button>
                <form action={exitAction}>
                  <button type="submit" className={styles.button}>
                    Salir de todas formas
                  </button>
                </form>
              </div>
            </div>
          </ModalWindow>
        </>
      )}
    </header>
  );
}
