"use client";

// El cierre en el celular (fase 7): el resumen de la obra, la foto para llevársela, la opción de no
// mostrarla y, si el anfitrión abre la galería, la votación por categorías y los ganadores.

import { useCallback, useEffect, useState } from "react";
import type { PlayerGallery } from "@/lib/brick-gallery";
import type { BuilderEngine } from "../builder/engine";
import { downloadBlob } from "../mural";
import { brickSound } from "../sound";
import styles from "../builder/challenge.module.css";
import own from "./team.module.css";

interface Props {
  engine: BuilderEngine;
  teamName: string;
  /** Cambia cada vez que llega un aviso de la galería por tiempo real. */
  signal: number;
  /** El resumen de piezas y créditos que ya existía al terminar. */
  summary: React.ReactNode;
  title: string;
}

/** Red de seguridad por si se pierde un aviso (celular bloqueado, red lenta). */
const POLL_MS = 6000;

export default function TeamClosing({ engine, teamName, signal, summary, title }: Props) {
  const [gallery, setGallery] = useState<PlayerGallery | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/bricks/gallery", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setGallery((await res.json()) as PlayerGallery);
  }, []);

  useEffect(() => {
    // La carga es asíncrona: el estado se pone cuando llega la respuesta, no dentro del efecto.
    const first = setTimeout(() => void load(), 0);
    return () => clearTimeout(first);
  }, [load, signal]);

  const status = gallery?.status ?? null;
  useEffect(() => {
    if (status === "results") return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load, status]);

  useEffect(() => {
    if (status === "voting") brickSound().play("pick");
    if (status === "results") brickSound().play("place");
  }, [status]);

  const post = async (body: object, key: string): Promise<boolean> => {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/bricks/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(out.error ?? "No se pudo.");
        void load();
        return false;
      }
      return true;
    } catch {
      setError("Sin conexión. Vuelve a intentarlo.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const savePhoto = async () => {
    setBusy("photo");
    try {
      const photo = await engine.deliveryPhoto(1600);
      if (photo) downloadBlob(photo.blob, `obra-${teamName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}.jpg`);
      else setError("No pudimos tomar la foto.");
    } finally {
      setBusy(null);
    }
  };

  const photoButton = (
    <button type="button" className={styles.secondary} onClick={savePhoto} disabled={busy === "photo"}>
      {busy === "photo" ? "Tomando la foto…" : "Descargar la foto de nuestra obra"}
    </button>
  );

  // ---- Votación ----
  if (gallery && status === "voting") {
    const cats = gallery.categories;
    const done = step >= cats.length;
    const cat = cats[Math.min(step, cats.length - 1)];
    const voted = cats.filter((c) => gallery.votes[c.key] !== undefined).length;
    const choose = async (teamId: number) => {
      const prev = gallery.votes[cat.key];
      setGallery({ ...gallery, votes: { ...gallery.votes, [cat.key]: teamId } });
      brickSound().play("place");
      if (await post({ action: "vote", category: cat.key, team: teamId }, "vote")) setTimeout(() => setStep((s) => s + 1), 350);
      else setGallery((g) => (g ? { ...g, votes: { ...g.votes, [cat.key]: prev } } : g));
    };
    return (
      <div className={styles.backdrop} data-builder-ui>
        <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="tc-vote">
          {done ? (
            <>
              <p className={styles.kicker}>Galería de cierre</p>
              <h2 id="tc-vote" className={styles.title}>
                ¡Listo, votaste!
              </h2>
              <p className={styles.body}>
                Votaste en {voted} de {cats.length} categorías. Puedes cambiar tus votos hasta que el anfitrión muestre los resultados en el proyector.
              </p>
              <button type="button" className={styles.secondary} onClick={() => setStep(0)}>
                Revisar mis votos
              </button>
            </>
          ) : (
            <>
              <p className={styles.kicker}>
                Categoría {step + 1} de {cats.length}
              </p>
              <h2 id="tc-vote" className={styles.title}>
                {cat.title}
              </h2>
              <p className={styles.muted}>{cat.hint}. Las obras van sin nombre; la de tu equipo no se puede elegir.</p>
              <ul className={own.voteGrid} aria-label={`Obras para ${cat.title}`}>
                {gallery.entries.map((e) => {
                  const chosen = gallery.votes[cat.key] === e.teamId;
                  return (
                    <li key={e.teamId}>
                      <button
                        type="button"
                        className={own.voteCard}
                        aria-pressed={chosen}
                        disabled={e.mine || busy === "vote"}
                        onClick={() => choose(e.teamId)}
                      >
                        {e.hasPhoto ? (
                          // Ruta propia con permisos: next/image no aporta nada con fotos privadas.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/bricks/photo/${e.teamId}`} alt="" />
                        ) : (
                          <span className={own.voteNoPhoto}>Sin foto</span>
                        )}
                        <span className={own.voteLabel}>{e.mine ? "La de tu equipo" : `Obra ${e.number}`}</span>
                        {chosen && <span className={own.voteCheck}>Tu voto</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {gallery.hidden && <p className={styles.muted}>Tu equipo prefirió no mostrar su obra, pero igual puedes votar por las demás.</p>}
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.row}>
                {step > 0 && (
                  <button type="button" className={styles.secondary} onClick={() => setStep(step - 1)}>
                    Anterior
                  </button>
                )}
                <button type="button" className={styles.secondary} onClick={() => setStep(step + 1)}>
                  {gallery.votes[cat.key] === undefined ? "Saltar esta" : "Siguiente"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Resultados ----
  if (gallery && status === "results" && gallery.results) {
    const won = gallery.results.filter((r) => r.winners.length > 0);
    return (
      <div className={styles.backdrop} data-builder-ui>
        <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="tc-results">
          <p className={styles.kicker}>{title}</p>
          <h2 id="tc-results" className={styles.title}>
            Así votó la sala
          </h2>
          {won.length === 0 ? (
            <p className={styles.body}>Nadie alcanzó a votar. Igual, cada obra cuenta algo.</p>
          ) : (
            <ul className={own.winners}>
              {won.map((r) => (
                <li key={r.key}>
                  <span className={own.winnerCat}>{r.title}</span>
                  {r.winners.map((w) => (
                    <span key={w.teamId} className={own.winnerTeam} style={{ "--team": w.color } as React.CSSProperties}>
                      <i aria-hidden="true" />
                      {w.name === teamName ? `¡Tu equipo! (${w.name})` : w.name}
                      <small>Obra {w.number}</small>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
          <p className={styles.muted}>Solo se muestra quién ganó cada categoría.</p>
          {photoButton}
        </div>
      </div>
    );
  }

  // ---- Antes de la galería ----
  return (
    <div className={styles.backdrop} data-builder-ui>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="tm-end">
        {summary}
        {photoButton}
        {gallery?.canHide && (
          <div className={own.hide}>
            {gallery.hidden ? (
              <>
                <p>Tu equipo no va a mostrar su obra en la galería ni en el mural.</p>
                <button type="button" className={styles.secondary} onClick={async () => (await post({ action: "show" }, "hide")) && load()} disabled={busy === "hide"}>
                  Mejor sí mostrarla
                </button>
              </>
            ) : (
              <button type="button" className={own.hideLink} onClick={async () => (await post({ action: "hide" }, "hide")) && load()} disabled={busy === "hide"}>
                No quiero mostrar la nuestra en la galería
              </button>
            )}
          </div>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
