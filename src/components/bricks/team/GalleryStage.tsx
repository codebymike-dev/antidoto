"use client";

// Galería de Cierre en el proyector (fase 7): primero las obras numeradas y sin nombre mientras la
// sala vota desde el celular; después, categoría por categoría, quién ganó, con la cámara encima
// de su obra. Nunca se muestra quién quedó de último (investigación, 6.3).

import { useEffect, useState } from "react";
import type { HostGallery } from "@/lib/brick-gallery";
import type { TeamView } from "@/lib/brick-session";
import { GALLERY_CATEGORIES } from "@/lib/bricks/gallery";
import styles from "./host.module.css";

interface Props {
  gallery: HostGallery;
  teams: TeamView[];
  pending: boolean;
  onReveal: () => void;
  onFocus: (teamId: number | null) => void;
  onMural: () => void;
  muralBusy: boolean;
}

export default function GalleryStage({ gallery, teams, pending, onReveal, onFocus, onMural, muralBusy }: Props) {
  const [step, setStep] = useState(0);
  // Solo se recorren las categorías en que alguien votó.
  const won = (gallery.results ?? []).filter((r) => r.winners.length > 0);
  const current = won[step] ?? null;
  const focusId = gallery.status === "results" ? (current?.winners[0]?.teamId ?? null) : null;

  useEffect(() => {
    onFocus(focusId);
  }, [focusId, onFocus]);

  if (gallery.status === "voting") {
    return (
      <section className={styles.gallery} aria-labelledby="bh-gallery">
        <div className={styles.galleryHead}>
          <div>
            <p className={styles.kicker}>Galería de cierre</p>
            <h2 id="bh-gallery" className={styles.galleryTitle}>
              Voten desde el celular
            </h2>
            <p className={styles.galleryHint}>Las obras van sin nombre hasta el final. Nadie puede votar por la suya.</p>
          </div>
          <div className={styles.galleryCount} role="status">
            <b>{gallery.voters}</b> de {gallery.players} {gallery.players === 1 ? "persona votó" : "personas votaron"}
          </div>
        </div>
        <ol className={styles.galleryGrid} style={{ "--cols": Math.min(4, Math.max(2, Math.ceil(Math.sqrt(gallery.order.length)))) } as React.CSSProperties}>
          {gallery.order.map((id, n) => (
            <li key={id}>
              {gallery.photos.includes(id) ? (
                // Ruta propia con permisos: next/image no aporta nada con fotos privadas.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/bricks/photo/${id}`} alt={`Obra ${n + 1}`} />
              ) : (
                <span className={styles.galleryNoPhoto}>Sin foto</span>
              )}
              <span className={styles.galleryNumber}>Obra {n + 1}</span>
            </li>
          ))}
        </ol>
        <div className={styles.galleryFoot}>
          <ul className={styles.galleryCats} aria-label="Categorías">
            {GALLERY_CATEGORIES.map((c) => (
              <li key={c.key}>{c.title}</li>
            ))}
          </ul>
          <button type="button" className={styles.startBtn} onClick={onReveal} disabled={pending || gallery.voters === 0}>
            {gallery.voters === 0 ? "Esperando los primeros votos" : "Mostrar los resultados"}
          </button>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <div className={styles.end}>
        <div className={styles.spot}>
          <p className={styles.spotName}>Gracias por votar</p>
          <p className={styles.spotMembers}>Nadie alcanzó a votar en ninguna categoría. Igual, cada obra cuenta algo: recórranlas juntos.</p>
        </div>
      </div>
    );
  }

  const winners = current.winners.map((w) => ({ ...w, team: teams.find((t) => t.id === w.teamId) }));
  const last = step === won.length - 1;
  return (
    <div className={styles.end}>
      <div className={styles.spot} style={{ "--team": winners[0].color } as React.CSSProperties} aria-live="polite">
        <p className={styles.kicker}>
          Categoría {step + 1} de {won.length}
        </p>
        <p className={styles.spotCategory}>{current.title}</p>
        {winners.map((w) => (
          <div key={w.teamId}>
            <p className={styles.spotName} style={{ "--team": w.color } as React.CSSProperties}>
              <i aria-hidden="true" />
              {w.name}
            </p>
            <p className={styles.spotMembers}>
              Obra {w.number} · {w.members.join(" · ")}
            </p>
          </div>
        ))}
        <p className={styles.spotStat}>{current.votes === 1 ? "1 voto" : `${current.votes} votos`}{winners.length > 1 ? " cada una: empate" : ""}</p>
      </div>
      <div className={styles.endActions}>
        {step > 0 && (
          <button type="button" className={styles.ghostBtn} onClick={() => setStep(step - 1)}>
            Anterior
          </button>
        )}
        {!last ? (
          <button type="button" className={styles.startBtn} onClick={() => setStep(step + 1)} autoFocus>
            Siguiente categoría
          </button>
        ) : (
          <button type="button" className={styles.startBtn} onClick={onMural} disabled={muralBusy}>
            {muralBusy ? "Armando el mural…" : "Descargar el mural"}
          </button>
        )}
      </div>
    </div>
  );
}
