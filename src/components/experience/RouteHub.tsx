"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./player.module.css";
import PixelIcon from "./PixelIcon";
import SceneThumb from "./SceneThumb";
import TopBar from "./TopBar";
import { sceneSound } from "./sound";
import { SCENE_MAPS } from "./scenes";
import { routeProgress, totalMinutes, type Results } from "./progress";
import type { PublicExperience } from "@/lib/experiences/types";
import { GRAINS_CORRECT, GRAINS_FOUND } from "@/lib/experiences/texts";
import { finishExperience, saveWelcome } from "@/lib/experience-actions";
import { DEPARTAMENTOS } from "@/lib/colombia";
import type { ParticipantProfile, ProfileConfig } from "@/lib/profile";
import type { PublicBrand } from "@/lib/brand-palette";

interface Props {
  stations: PublicExperience[];
  results: Results;
  participant: string;
  company: string | null;
  brand?: PublicBrand | null;
  mode: "play" | "preview";
  paused?: boolean;
  exitAction?: () => Promise<void>;
  exitHref?: string;
  /** La bienvenida de Ramiro está abierta sobre el mapa. */
  welcomeOpen: boolean;
  /** Lo que pide el código en la ficha; null si no pide nada. */
  profileConfig: ProfileConfig | null;
  /** Ya terminó la bienvenida alguna vez (la está repitiendo). */
  onboarded: boolean;
  /** Estación que se acaba de terminar: el mapa celebra la que se abre. */
  celebrate: number | null;
  onWelcomeDone: () => void;
  onReplayWelcome: () => void;
  onEnter: (index: number) => void;
  onRestart: () => void;
}

/**
 * El mapa de la ruta: la casa del participante entre estaciones. Muestra qué terminó,
 * qué sigue y qué está cerrado; la primera vez, Ramiro da la bienvenida encima.
 */
export default function RouteHub(props: Props) {
  const { stations, results, participant, company, brand, mode, paused, welcomeOpen, celebrate } = props;
  const prog = routeProgress(stations, results);
  const [selected, setSelected] = useState(() => (prog.current === -1 ? stations.length - 1 : prog.current));
  const [spot, setSpot] = useState<"ruta" | "granos" | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const s = stations[selected];
  const allDone = prog.current === -1;

  function select(k: number) {
    setSelected(k);
    sceneSound().unlock();
    sceneSound().play("step");
    // En el celular la ficha de la estación queda debajo del mapa.
    if (window.matchMedia("(max-width: 1080px)").matches) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function enter() {
    sceneSound().unlock();
    sceneSound().play("open");
    props.onEnter(selected);
  }

  const celebrated = celebrate === null ? null : celebrate + 1 < stations.length ? stations[celebrate + 1] : null;

  return (
    <>
      <TopBar
        brand={brand}
        title={s.series}
        sub={`Mapa de la ruta · ${mode === "preview" ? "Vista previa" : participant}`}
        grains={prog.grains}
        found={prog.found}
        total={prog.total}
        spotPurse={spot === "granos"}
        exitAction={props.exitAction}
        exitHref={props.exitHref}
      />
      <main className={styles.main}>
        <div className={styles.stageCol}>
          <div className={`${styles.mapFrame} ${spot === "ruta" ? styles.mapTour : ""}`}>
            <RouteMap
              stations={stations}
              done={prog.done}
              open={prog.open}
              current={prog.current}
              selected={welcomeOpen ? null : selected}
              fresh={celebrate === null ? null : celebrate + 1}
              disabled={welcomeOpen}
              onSelect={select}
            />
            {celebrate !== null && !welcomeOpen && (
              <div role="status" className={`${styles.toast} ${styles.toastGood} ${styles.mapToast}`}>
                <PixelIcon name="insignia" size={20} />
                <span>
                  {celebrated ? (
                    <>
                      ¡Se abrió la estación {celebrated.station}: <b>{celebrated.title}</b>!
                    </>
                  ) : (
                    "¡Terminaste toda la ruta!"
                  )}
                </span>
              </div>
            )}
            {welcomeOpen && (
              <Welcome
                stations={stations}
                participant={participant}
                company={company}
                welcome={brand?.welcome ?? null}
                mode={mode}
                config={props.onboarded ? null : props.profileConfig}
                onSpot={setSpot}
                onDone={props.onWelcomeDone}
              />
            )}
          </div>
        </div>

        <aside className={styles.quest} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section ref={cardRef} className={styles.window} aria-labelledby="xp-station-title">
            <div className={`${styles.winHead} ${prog.done[selected] ? styles.winHeadGood : ""}`}>
              <PixelIcon name={prog.done[selected] ? "check" : prog.open[selected] ? "pin" : "candado"} size={14} />
              <span className={styles.winTitle}>
                Estación {s.station} de {stations.length}
              </span>
            </div>
            <div className={styles.winBody}>
              <h2 id="xp-station-title" className={styles.cardTitle}>
                {s.title}
              </h2>
              <p className={styles.cardMeta}>
                <PixelIcon name={SCENE_MAPS[s.scene].speaker} size={16} /> {s.character} · {s.minutes} · {s.risks.length} riesgos
              </p>
              <p>{s.description}</p>
              <StationAction
                station={s}
                index={selected}
                stations={stations}
                results={results}
                done={prog.done[selected]}
                open={prog.open[selected]}
                paused={!!paused && mode === "play"}
                onEnter={enter}
              />
            </div>
          </section>

          <section className={styles.window} aria-labelledby="xp-route-title">
            <div className={styles.winHead}>
              <PixelIcon name="insignia" size={16} />
              <span className={styles.winTitle} id="xp-route-title">
                Tu ruta · {prog.done.filter(Boolean).length}/{stations.length}
              </span>
            </div>
            <div className={styles.winBody}>
              <div className={styles.progress} aria-hidden>
                <div className={styles.progressFill} style={{ width: `${(prog.found / prog.total) * 100}%` }} />
              </div>
              <p className={styles.muted} style={{ fontSize: 13 }}>
                {prog.found} de {prog.total} riesgos resueltos · {prog.grains} granos
              </p>
              <ul className={styles.badges}>
                {stations.map((st, k) => (
                  <li key={st.key} className={prog.done[k] ? undefined : styles.badgeLocked} title={prog.done[k] ? st.badge : "Por ganar"}>
                    <PixelIcon name="insignia" size={34} />
                    <span>{prog.done[k] ? st.badge : "???"}</span>
                  </li>
                ))}
              </ul>
              {allDone &&
                (mode === "play" ? (
                  <form action={finishExperience}>
                    <button type="submit" className={`${styles.button} ${styles.go}`} style={{ width: "100%" }}>
                      Terminar la ruta
                    </button>
                  </form>
                ) : (
                  <button type="button" className={`${styles.button} ${styles.go}`} onClick={props.onRestart}>
                    Volver a empezar
                  </button>
                ))}
            </div>
          </section>

          <section className={styles.window} aria-labelledby="xp-help-title">
            <div className={styles.winHead}>
              <PixelIcon name="pista" size={16} />
              <span className={styles.winTitle} id="xp-help-title">
                Cómo se juega
              </span>
            </div>
            <div className={styles.winBody}>
              <ol className={styles.steps}>
                <li>
                  <PixelIcon name="repetir" size={16} /> Mira la historia de cada estación.
                </li>
                <li>
                  <PixelIcon name="riesgo" size={16} /> Toca donde veas un error.
                </li>
                <li>
                  <PixelIcon name="grano" size={16} /> Acierta a la primera: {GRAINS_CORRECT} granos.
                </li>
              </ol>
              <button type="button" className={styles.button} onClick={props.onReplayWelcome} disabled={welcomeOpen}>
                Ver la bienvenida otra vez
              </button>
            </div>
          </section>
        </aside>
      </main>
    </>
  );
}

function StationAction({
  station,
  index,
  stations,
  results,
  done,
  open,
  paused,
  onEnter,
}: {
  station: PublicExperience;
  index: number;
  stations: PublicExperience[];
  results: Results;
  done: boolean;
  open: boolean;
  paused: boolean;
  onEnter: () => void;
}) {
  const mine = station.risks.map((r) => results.get(r.id)).filter((r) => !!r);
  if (!open) {
    const prev = stations[index - 1];
    return (
      <p className={styles.lockNote}>
        <PixelIcon name="candado" size={14} /> Se abre cuando termines la estación {prev.station}: {prev.title}.
      </p>
    );
  }
  if (paused) return <p className={styles.pausedNote}>Esta actividad está pausada por tu administrador. Tu avance sigue guardado.</p>;
  if (done) {
    const spotted = mine.filter((r) => r.chosen !== null).length;
    const correct = mine.filter((r) => r.correct).length;
    return (
      <>
        <p className={styles.doneNote}>
          <PixelIcon name="check" size={14} /> Encontraste {spotted} de {station.risks.length}, {correct} a la primera. Insignia:{" "}
          <b>{station.badge}</b>.
        </p>
        <button type="button" className={styles.button} onClick={onEnter}>
          Repasar la estación
        </button>
      </>
    );
  }
  return (
    <button type="button" autoFocus className={`${styles.button} ${styles.go}`} onClick={onEnter}>
      {mine.length > 0 ? `Continuar (${mine.length}/${station.risks.length})` : station.enter}
    </button>
  );
}

// --- Mapa ------------------------------------------------------------------------------

function RouteMap({
  stations,
  done,
  open,
  current,
  selected,
  fresh,
  disabled,
  onSelect,
}: {
  stations: PublicExperience[];
  done: boolean[];
  open: boolean[];
  current: number;
  selected: number | null;
  fresh: number | null;
  disabled: boolean;
  onSelect: (k: number) => void;
}) {
  // Las estaciones van en zigzag de izquierda a derecha; el camino pasa por el centro de cada una.
  const n = stations.length;
  const pts = stations.map((_, k) => ({ x: n === 1 ? 50 : 11 + (78 * k) / (n - 1), y: k % 2 === 0 ? 63 : 32 }));
  const d = pts
    .map((p, k) => {
      if (k === 0) return `M ${p.x} ${p.y}`;
      const a = pts[k - 1];
      const mid = (p.x - a.x) / 2;
      return `C ${a.x + mid} ${a.y}, ${p.x - mid} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");

  return (
    <div className={styles.map}>
      {/* La firma de la marca pintada en el pasto, de fondo: la ruta es la de Juan Valdez. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/experiencias/juan-valdez.png" alt="" aria-hidden className={styles.mapSignature} />
      <svg className={styles.mapRoad} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={d} className={styles.mapRoadEdge} vectorEffect="non-scaling-stroke" />
        <path d={d} className={styles.mapRoadDirt} vectorEffect="non-scaling-stroke" />
        <path d={d} className={styles.mapRoadDash} vectorEffect="non-scaling-stroke" />
      </svg>
      <ol className={styles.mapNodes} aria-label="Estaciones de la ruta">
        {stations.map((s, k) => {
          const state = done[k] ? "hecha" : open[k] ? "abierta" : "cerrada";
          return (
            <li
              key={s.key}
              className={`${styles.node} ${!open[k] ? styles.nodeLocked : ""} ${selected === k ? styles.nodeOn : ""} ${fresh === k ? styles.nodeFresh : ""}`}
              style={{ "--x": `${pts[k].x}%`, "--y": `${pts[k].y}%`, "--k": k } as React.CSSProperties}
            >
              <button
                type="button"
                className={styles.nodeButton}
                onClick={() => onSelect(k)}
                disabled={disabled}
                aria-pressed={selected === k}
                aria-label={`Estación ${s.station}: ${s.title}, ${state}`}
              >
                {current === k && (
                  <span className={styles.nodeHere} aria-hidden>
                    <PixelIcon name="pin" size={22} />
                    <span>Aquí vas</span>
                  </span>
                )}
                <span className={styles.nodeThumb}>
                  <SceneThumb scene={s.scene} label="" />
                  {done[k] && (
                    <span className={styles.nodeBadge} aria-hidden>
                      <PixelIcon name="check" size={14} />
                    </span>
                  )}
                  {!open[k] && (
                    <span className={styles.nodeLock} aria-hidden>
                      <PixelIcon name="candado" size={20} />
                    </span>
                  )}
                </span>
                <span className={styles.nodeLabel}>
                  <span className={styles.nodeNum}>{s.station}</span>
                  {s.title.split(":")[0]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// --- Bienvenida --------------------------------------------------------------------------

interface Page {
  text: string;
  spot?: "ruta" | "granos";
}

function Welcome({
  stations,
  participant,
  company,
  welcome,
  mode,
  config,
  onSpot,
  onDone,
}: {
  stations: PublicExperience[];
  participant: string;
  company: string | null;
  welcome: string | null;
  mode: "play" | "preview";
  /** Qué pide la ficha; null si no hay ficha que llenar. */
  config: ProfileConfig | null;
  onSpot: (spot: "ruta" | "granos" | null) => void;
  onDone: () => void;
}) {
  const first = participant.trim().split(/\s+/)[0];
  const minutes = totalMinutes(stations);
  const asks = !!config && (!!config.cargos || config.askPlace);
  const pages: Page[] = [
    {
      text: `¡Hola, ${first}! Soy Ramiro, recolector de café. Qué bueno tenerte en la ${stations[0].series}${company ? ` de ${company}` : ""}.`,
    },
    {
      text: "En esta ruta la gente trabaja como siempre lo ha hecho, pero comete errores que le pueden costar la salud. Tu misión es encontrarlos antes de que alguien se lastime.",
    },
    {
      text: `Son ${stations.length} estaciones, de ${stations[0].title.split(":")[0].toLowerCase()} a ${stations[stations.length - 1].title.split(":")[0].toLowerCase()}${minutes ? `, unos ${minutes} en total` : ""}. Cada una se abre cuando terminas la anterior.`,
      spot: "ruta",
    },
    {
      text: `En cada estación miras la historia, tocas los errores y eliges qué está mal. Si aciertas a la primera ganas ${GRAINS_CORRECT} granos de café; si lo encuentras pero fallas, ${GRAINS_FOUND}. Y cada estación te da una insignia.`,
      spot: "granos",
    },
    {
      text: "Puedes parar cuando quieras: si cierras esta pestaña, al volver en este mismo dispositivo sigues donde ibas.",
    },
    asks
      ? { text: `Antes de arrancar, cuéntame un poco de ti. Así ${company ?? "tu empresa"} sabe dónde reforzar el cuidado de su gente.` }
      : { text: "¡Listo! Empecemos por la finca. Yo te espero allá." },
  ];

  const [page, setPage] = useState(0);
  const [chars, setChars] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = pages[page].text;
  const typing = chars < text.length;
  const last = page === pages.length - 1;

  // Máquina de escribir, como los diálogos de los juegos pixel. Sin animaciones, sale completo.
  useEffect(() => {
    if (!typing) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setInterval(() => setChars((c) => (reduce ? text.length : Math.min(text.length, c + 2))), 22);
    return () => clearInterval(t);
  }, [text, typing]);

  useEffect(() => {
    onSpot(pages[page].spot ?? null);
    return () => onSpot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function go(to: number) {
    sceneSound().unlock();
    sceneSound().play("pop");
    setPage(to);
    setChars(0);
  }

  function next() {
    if (typing) {
      setChars(text.length);
      return;
    }
    if (!last) return go(page + 1);
    if (asks) {
      setProfileOpen(true);
      sceneSound().play("open");
      return;
    }
    void finish({ cargo: null, municipio: null });
  }

  async function finish(profile: ParticipantProfile) {
    if (mode === "play") {
      setPending(true);
      setError(null);
      const out = await saveWelcome(profile);
      setPending(false);
      if (!out.ok) {
        setError(out.error);
        return;
      }
    }
    sceneSound().play("badge");
    onDone();
  }

  if (profileOpen && config) {
    return (
      <>
        <div className={styles.dim} />
        <ProfileWindow config={config} company={company} pending={pending} error={error} onSave={finish} />
      </>
    );
  }

  return (
    <section className={`${styles.window} ${styles.talk}`} role="dialog" aria-label="Bienvenida de Ramiro" aria-live="polite">
      <div className={styles.talkFace} aria-hidden>
        <PixelIcon name="ramiro" size={52} />
      </div>
      <div className={styles.talkBody}>
        <div className={styles.talkName}>Ramiro</div>
        <p className={styles.talkText}>
          <span>{text.slice(0, chars)}</span>
          {/* El resto ocupa su lugar invisible: la caja no salta de tamaño mientras escribe. */}
          <span aria-hidden style={{ visibility: "hidden" }}>
            {text.slice(chars)}
          </span>
        </p>
        {page === 0 && welcome && !typing && (
          <p className={styles.talkNote}>
            <b>{company ?? "Tu empresa"} te dice:</b> {welcome}
          </p>
        )}
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.talkActions}>
          <span className={styles.talkDots} aria-label={`Paso ${page + 1} de ${pages.length}`}>
            {pages.map((_, k) => (
              <i key={k} className={k === page ? styles.talkDotOn : undefined} />
            ))}
          </span>
          {!last && (
            <button type="button" className={styles.textButton} onClick={() => go(pages.length - 1)}>
              Saltar
            </button>
          )}
          {page > 0 && (
            <button type="button" className={styles.button} onClick={() => go(page - 1)} aria-label="Anterior">
              ◂
            </button>
          )}
          <button type="button" autoFocus className={`${styles.button} ${last ? styles.go : styles.primary}`} onClick={next} disabled={pending}>
            {typing ? "Sigue ▸" : last ? (asks ? "Llenar mi ficha" : pending ? "Un momento…" : "¡Vamos!") : "Sigue ▸"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ProfileWindow({
  config,
  company,
  pending,
  error,
  onSave,
}: {
  config: ProfileConfig;
  company: string | null;
  pending: boolean;
  error: string | null;
  onSave: (p: ParticipantProfile) => void;
}) {
  const [cargo, setCargo] = useState("");
  const [dept, setDept] = useState("");
  const [municipio, setMunicipio] = useState("");
  const municipios = DEPARTAMENTOS.find((d) => d.code === dept)?.municipios ?? [];

  return (
    <section className={`${styles.window} ${styles.dialogCenter}`} role="dialog" aria-labelledby="xp-profile-title">
      <div className={styles.winHead}>
        <PixelIcon name="ramiro" size={16} />
        <span className={styles.winTitle} id="xp-profile-title">
          Tu ficha
        </span>
      </div>
      <form
        className={styles.winBody}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ cargo: config.cargos ? cargo : null, municipio: config.askPlace ? municipio : null });
        }}
      >
        <p className={styles.muted}>Elige de las listas. {company ?? "Tu empresa"} lo usa para ver dónde reforzar la prevención.</p>
        {config.cargos && (
          <label className={styles.field}>
            <span>¿Cuál es tu cargo?</span>
            <select className={styles.select} value={cargo} onChange={(e) => setCargo(e.target.value)} required autoFocus>
              <option value="" disabled>
                Elige tu cargo
              </option>
              {config.cargos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        {config.askPlace && (
          <>
            <label className={styles.field}>
              <span>¿En qué departamento trabajas?</span>
              <select
                className={styles.select}
                value={dept}
                onChange={(e) => {
                  const d = DEPARTAMENTOS.find((x) => x.code === e.target.value);
                  setDept(e.target.value);
                  // Bogotá es a la vez departamento y municipio: no hay nada más que elegir.
                  setMunicipio(d && d.municipios.length === 1 ? d.municipios[0][0] : "");
                }}
                required
                autoFocus={!config.cargos}
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
              <select className={styles.select} value={municipio} onChange={(e) => setMunicipio(e.target.value)} required disabled={!dept}>
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
        {error && <p className={styles.formError}>{error}</p>}
        <button type="submit" className={`${styles.button} ${styles.go}`} disabled={pending} style={{ alignSelf: "flex-start" }}>
          {pending ? "Guardando…" : "Guardar y seguir"}
        </button>
      </form>
    </section>
  );
}
