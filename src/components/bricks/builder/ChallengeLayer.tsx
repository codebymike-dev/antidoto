"use client";

// Lo que agrega un reto de la biblioteca al constructor (fase 5 de docs/plan-construccion-3d.md):
// la consigna con la ficha del participante, el reloj y el presupuesto, el modelo a replicar, el
// guardado automático y la entrega con foto. En la prueba del admin todo funciona igual, pero
// nada se guarda.

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { KIND_LABEL, LIMITS, type PublicBuild } from "@/lib/bricks/challenges";
import { saveDraft, startBuild, submitWork } from "@/lib/build-actions";
import { saveWelcome } from "@/lib/experience-actions";
import type { Blocked } from "@/lib/experience-actions";
import { DEPARTAMENTOS } from "@/lib/colombia";
import type { ProfileConfig } from "@/lib/profile";
import { withTimeout } from "@/lib/with-timeout";
import { brickSound } from "../sound";
import type { BuilderEngine, BuilderSnapshot } from "./engine";
import { Icon } from "./icons";
import styles from "./challenge.module.css";

export interface ChallengeSession {
  mode: "play" | "preview";
  participant: string | null;
  company: string | null;
  welcome: string | null;
  paused: boolean;
  /** El reto ya había arrancado (se retoma sin consigna) y cuánto lleva su reloj. */
  started: boolean;
  elapsedMs: number;
  /** Ficha que pide el código; null = ya se llenó o no se pide. */
  profile: ProfileConfig | null;
  /** La bienvenida ya se cerró antes (en otro dispositivo o en una visita anterior). */
  onboarded: boolean;
}

type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  engine: BuilderEngine;
  snap: BuilderSnapshot;
  challenge: PublicBuild;
  session: ChallengeSession;
  introOpen: boolean;
  onIntroClose: () => void;
}

const subscribeOnline = (fn: () => void) => {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
};

function failMessage(): string {
  return typeof navigator !== "undefined" && !navigator.onLine
    ? "Sin conexión. Tu obra sigue aquí: vuelve a intentarlo cuando tengas señal."
    : "No pudimos conectar con el servidor. Vuelve a intentarlo.";
}

function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatLimit(seconds: number): string {
  if (seconds < 120) return `${seconds} segundos`;
  return `${Math.round(seconds / 60)} minutos`;
}

const blob = (bytes: Uint8Array) => new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" });

export default function ChallengeLayer({ engine, snap, challenge, session, introOpen, onIntroClose }: Props) {
  const { timeLimit } = challenge;
  const play = session.mode === "play";
  const router = useRouter();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [deadline, setDeadline] = useState<number | null>(() =>
    session.started && timeLimit ? Date.now() + timeLimit * 1000 - session.elapsedMs : null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [save, setSave] = useState<SaveState>("idle");
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [model, setModel] = useState<{ open: boolean; url: string | null }>({ open: false, url: null });
  const [delivery, setDelivery] = useState<{ photo: { blob: Blob; url: string } | null; done: boolean } | null>(null);

  const remaining = deadline === null ? null : deadline - now;
  const timeUp = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);

  // Avisos sonoros a los 30 s y al final (investigación, 6.4).
  const warn = remaining !== null && remaining > 0 && remaining <= 30000;
  useEffect(() => {
    if (warn) brickSound().play("invalid");
  }, [warn]);
  useEffect(() => {
    if (timeUp) brickSound().play("remove");
  }, [timeUp]);

  // Guardado automático: unos segundos después del último cambio, solo jugando de verdad.
  useEffect(() => {
    if (!play || introOpen || snap.version === 0 || delivery?.done) return;
    const id = setTimeout(async () => {
      setSave("saving");
      const fd = new FormData();
      fd.set("data", blob(engine.exportBuild()));
      try {
        const out = await withTimeout(saveDraft(fd), 20000);
        if (out.ok) setSave("saved");
        else {
          setSave("error");
          setBlocked(out);
        }
      } catch {
        setSave("error");
      }
    }, 2500);
    return () => clearTimeout(id);
  }, [engine, play, introOpen, snap.version, delivery?.done]);

  function showModel() {
    if (!challenge.model) return;
    const url = model.url ?? engine.modelPhoto(challenge.model.bricks, challenge.model.base);
    setModel({ open: true, url });
  }

  async function openDelivery() {
    if (snap.count === 0) return;
    engine.clearHand();
    setDelivery({ photo: null, done: false });
    const photo = await engine.deliveryPhoto();
    setDelivery({ photo, done: false });
  }

  const begin = (elapsedMs: number) => {
    if (timeLimit) {
      const t = Date.now();
      setNow(t);
      setDeadline(t + timeLimit * 1000 - elapsedMs);
    }
    brickSound().play("pick");
    onIntroClose();
  };

  if (session.paused) {
    return (
      <div className={styles.backdrop}>
        <div className={styles.sheet} role="alertdialog" aria-labelledby="bk-paused">
          <p className={styles.kicker}>{KIND_LABEL[challenge.kind]}</p>
          <h2 id="bk-paused" className={styles.title}>
            Actividad en pausa
          </h2>
          <p className={styles.body}>Tu administrador pausó esta actividad por ahora. Vuelve a entrar más tarde con tu mismo nombre y código: lo que construiste queda guardado.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!introOpen && (
        <div className={styles.hud} data-builder-ui>
          {remaining !== null && (
            <span className={`${styles.clock} ${warn ? styles.clockWarn : ""}`} role="timer" aria-label={`Quedan ${formatClock(remaining)}`}>
              {formatClock(remaining)}
            </span>
          )}
          {challenge.model && (
            <button type="button" className={styles.chip} onClick={showModel}>
              Ver modelo
            </button>
          )}
          <button type="button" className={styles.deliver} onClick={openDelivery} disabled={snap.count === 0} title={snap.count === 0 ? "Pon al menos una pieza" : undefined}>
            Entregar
          </button>
        </div>
      )}

      {play && !introOpen && (
        <p className={styles.saveState} aria-live="polite" data-builder-ui>
          {!online ? "Sin conexión: guardaremos al volver la señal" : save === "saving" ? "Guardando…" : save === "saved" ? "Guardado" : save === "error" ? "No se pudo guardar" : ""}
        </p>
      )}

      {introOpen && <Intro challenge={challenge} session={session} onModel={showModel} onStart={begin} />}

      {model.open && (
        <div className={styles.backdrop} onClick={() => setModel((m) => ({ ...m, open: false }))} data-builder-ui>
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Modelo a replicar" onClick={(e) => e.stopPropagation()}>
            <div className={styles.head}>
              <h2 className={styles.title}>El modelo</h2>
              <button type="button" className={styles.close} onClick={() => setModel((m) => ({ ...m, open: false }))} aria-label="Cerrar" autoFocus>
                <Icon name="close" />
              </button>
            </div>
            {/* Data URL dibujada en el navegador: next/image no aporta nada aquí. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {model.url ? <img className={styles.photo} src={model.url} alt="El modelo que hay que construir igual" /> : <p className={styles.body}>No pudimos dibujar el modelo.</p>}
            <p className={styles.muted}>{challenge.model!.bricks.length} piezas. Fíjate en los colores y en qué va encima de qué.</p>
          </div>
        </div>
      )}

      {timeUp && !delivery && (
        <div className={styles.backdrop} data-builder-ui>
          <div className={styles.sheet} role="alertdialog" aria-labelledby="bk-timeup">
            <p className={styles.kicker}>Tiempo</p>
            <h2 id="bk-timeup" className={styles.title}>
              ¡Se acabó el tiempo!
            </h2>
            <p className={styles.body}>
              {snap.count > 0 ? "Así quedó tu obra. Entrégala para que quede guardada." : "No alcanzaste a poner piezas. Pon al menos una para entregar."}
            </p>
            {snap.count > 0 && (
              <button type="button" className={styles.primary} onClick={openDelivery} autoFocus>
                Entregar mi obra
              </button>
            )}
            {snap.count === 0 && (
              <button type="button" className={styles.primary} onClick={() => setDeadline(null)} autoFocus>
                Seguir sin reloj
              </button>
            )}
          </div>
        </div>
      )}

      {delivery && (
        <Delivery
          challenge={challenge}
          play={play}
          photo={delivery.photo}
          done={delivery.done}
          canGoBack={!timeUp}
          onBack={() => setDelivery(null)}
          onSubmit={async (story) => {
            if (!play) {
              setDelivery((d) => (d ? { ...d, done: true } : d));
              return null;
            }
            const fd = new FormData();
            fd.set("data", blob(engine.exportBuild()));
            fd.set("image", delivery.photo!.blob, "obra.jpg");
            fd.set("title", story.title);
            fd.set("phrase", story.phrase);
            fd.set("share", story.share ? "1" : "0");
            try {
              const out = await withTimeout(submitWork(fd), 30000);
              // "Ya la entregaste": otra pestaña se adelantó; se va al cierre igual.
              if (!out.ok && out.reason !== "done") return out.error;
            } catch {
              return failMessage();
            }
            brickSound().play("place");
            setDelivery((d) => (d ? { ...d, done: true } : d));
            router.push("/mision/completada");
            return null;
          }}
        />
      )}

      {blocked && blocked.reason !== "other" && (
        <div className={styles.backdrop} data-builder-ui>
          <div className={styles.sheet} role="alertdialog" aria-labelledby="bk-blocked">
            <h2 id="bk-blocked" className={styles.title}>
              No se puede seguir
            </h2>
            <p className={styles.body}>{blocked.error}</p>
            <a className={styles.primary} href={blocked.reason === "done" ? "/mision/completada" : "/"}>
              {blocked.reason === "done" ? "Ver mi obra" : "Volver al inicio"}
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function Intro({ challenge, session, onModel, onStart }: { challenge: PublicBuild; session: ChallengeSession; onModel: () => void; onStart: (elapsedMs: number) => void }) {
  const { texts, timeLimit, maxPieces } = challenge;
  const config = session.mode === "play" && !session.onboarded ? session.profile : null;
  const asks = !!config && (!!config.cargos || config.askPlace);
  const [cargo, setCargo] = useState("");
  const [dept, setDept] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const municipios = DEPARTAMENTOS.find((d) => d.code === dept)?.municipios ?? [];
  const first = session.participant?.trim().split(/\s+/)[0];

  async function start(e: React.FormEvent) {
    e.preventDefault();
    brickSound().unlock();
    if (session.mode === "preview") return onStart(0);
    setPending(true);
    setError(null);
    try {
      if (!session.onboarded) {
        const saved = await withTimeout(saveWelcome({ cargo: config?.cargos ? cargo : null, municipio: config?.askPlace ? municipio : null }), 20000);
        if (!saved.ok) {
          setPending(false);
          setError(saved.error);
          return;
        }
      }
      const out = await withTimeout(startBuild(), 20000);
      setPending(false);
      if (!out.ok) return setError(out.error);
      onStart(out.elapsedMs);
    } catch {
      setPending(false);
      setError(failMessage());
    }
  }

  return (
    <div className={styles.backdrop} data-builder-ui>
      <form className={`${styles.sheet} ${styles.intro}`} role="dialog" aria-modal="true" aria-labelledby="bk-intro" onSubmit={start}>
        <p className={styles.kicker}>
          <span className={styles.kindDot} aria-hidden="true" /> {KIND_LABEL[challenge.kind]}
        </p>
        {first && <p className={styles.hello}>¡Hola, {first}!</p>}
        <h2 id="bk-intro" className={styles.title}>
          {texts.title}
        </h2>
        <p className={styles.prompt}>{texts.prompt}</p>
        <ul className={styles.rules}>
          <li>
            <b>{timeLimit ? formatLimit(timeLimit) : "Sin reloj"}</b>
            <span>{timeLimit ? "desde que empiezas" : "a tu ritmo"}</span>
          </li>
          <li>
            <b>{maxPieces ? `${maxPieces} piezas` : "Piezas libres"}</b>
            <span>{maxPieces ? "ni una más" : "todas las que quieras"}</span>
          </li>
          {challenge.story && (
            <li>
              <b>Título y frase</b>
              <span>al entregar</span>
            </li>
          )}
        </ul>
        {challenge.model && (
          <button type="button" className={styles.secondary} onClick={onModel}>
            Ver el modelo
          </button>
        )}
        {session.welcome && <p className={styles.muted}>{session.welcome}</p>}

        {asks && (
          <fieldset className={styles.profile}>
            <legend>Antes de empezar, cuéntanos un poco de ti</legend>
            {config!.cargos && (
              <label className={styles.field}>
                <span>¿Cuál es tu cargo?</span>
                <select value={cargo} onChange={(e) => setCargo(e.target.value)} required>
                  <option value="" disabled>
                    Elige tu cargo
                  </option>
                  {config!.cargos.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {config!.askPlace && (
              <>
                <label className={styles.field}>
                  <span>¿En qué departamento trabajas?</span>
                  <select
                    value={dept}
                    onChange={(e) => {
                      const d = DEPARTAMENTOS.find((x) => x.code === e.target.value);
                      setDept(e.target.value);
                      // Bogotá es a la vez departamento y municipio: no hay nada más que elegir.
                      setMunicipio(d && d.municipios.length === 1 ? d.municipios[0][0] : "");
                    }}
                    required
                  >
                    <option value="" disabled>
                      Elige el departamento
                    </option>
                    {DEPARTAMENTOS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>¿En qué municipio?</span>
                  <select value={municipio} onChange={(e) => setMunicipio(e.target.value)} required disabled={!dept}>
                    <option value="" disabled>
                      {dept ? "Elige el municipio" : "Primero elige el departamento"}
                    </option>
                    {municipios.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <p className={styles.muted}>{session.company ?? "Tu empresa"} lo usa para ver los resultados por cargo y por lugar.</p>
          </fieldset>
        )}

        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.primary} disabled={pending} autoFocus={!asks}>
          {pending ? "Un momento…" : timeLimit ? "Empezar: arranca el reloj" : "Empezar a construir"}
        </button>
        {session.mode === "preview" && <p className={styles.muted}>Estás probando el reto: nada de lo que construyas se guarda.</p>}
      </form>
    </div>
  );
}

function Delivery({
  challenge,
  play,
  photo,
  done,
  canGoBack,
  onBack,
  onSubmit,
}: {
  challenge: PublicBuild;
  play: boolean;
  photo: { blob: Blob; url: string } | null;
  done: boolean;
  canGoBack: boolean;
  onBack: () => void;
  /** Devuelve el error para mostrar, o null si salió bien. */
  onSubmit: (story: { title: string; phrase: string; share: boolean }) => Promise<string | null>;
}) {
  const [title, setTitle] = useState("");
  const [phrase, setPhrase] = useState("");
  const [share, setShare] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done && !play) {
    return (
      <div className={styles.backdrop} data-builder-ui>
        <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="bk-done">
          <p className={styles.kicker}>Prueba</p>
          <h2 id="bk-done" className={styles.title}>
            Así se entregaría
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo && <img className={styles.photo} src={photo.url} alt="Foto de la obra" />}
          {title && (
            <p className={styles.body}>
              <b>{title}</b>
              {phrase && <>: {phrase}</>}
            </p>
          )}
          <p className={styles.muted}>En la prueba no se guarda nada. El participante pasa a su pantalla de cierre con la foto de su obra.</p>
          <button type="button" className={styles.primary} onClick={onBack} autoFocus>
            Volver a construir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.backdrop} data-builder-ui>
      <form
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bk-deliver"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!photo) return;
          setPending(true);
          setError(null);
          const err = await onSubmit({ title, phrase, share });
          setPending(false);
          if (err) setError(err);
        }}
      >
        <div className={styles.head}>
          <h2 id="bk-deliver" className={styles.title}>
            Entregar tu obra
          </h2>
          {canGoBack && (
            <button type="button" className={styles.close} onClick={onBack} aria-label="Seguir construyendo">
              <Icon name="close" />
            </button>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo ? <img className={styles.photo} src={photo.url} alt="Foto de tu obra" /> : <div className={styles.photoSkeleton} aria-label="Tomando la foto" />}
        {challenge.story && (
          <>
            <label className={styles.field}>
              <span>Título de tu obra</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.workTitle} required placeholder="Ej.: El puente que nos une" autoFocus />
            </label>
            <label className={styles.field}>
              <span>Una frase que la cuente</span>
              <textarea value={phrase} onChange={(e) => setPhrase(e.target.value)} maxLength={LIMITS.workPhrase} required rows={3} placeholder="¿Qué significa? ¿Qué representa cada parte?" />
            </label>
          </>
        )}
        <label className={styles.check}>
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
          <span>Mostrar mi obra en el mural de la actividad</span>
        </label>
        {!challenge.story && <p className={styles.muted}>Después de entregar ya no se puede cambiar.</p>}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.row}>
          {canGoBack && (
            <button type="button" className={styles.secondary} onClick={onBack}>
              Seguir construyendo
            </button>
          )}
          <button type="submit" className={styles.primary} disabled={pending || !photo} autoFocus={!challenge.story}>
            {pending ? "Entregando…" : "Entregar"}
          </button>
        </div>
      </form>
    </div>
  );
}
