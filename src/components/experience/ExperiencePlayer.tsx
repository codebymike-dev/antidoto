"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pixelify_Sans } from "next/font/google";
import styles from "./player.module.css";
import SceneCanvas from "./SceneCanvas";
import PixelIcon from "./PixelIcon";
import { sceneSound } from "./sound";
import type { FincaScene, Moment, Zone } from "./scenes/finca";
import { FINCA_MOMENTS, FINCA_OK, FINCA_RISK_ZONES, FINCA_ZONE_LABELS, risksInMoment } from "./scenes/finca-map";
import type { PublicExperience, RiskResult, RiskTexts } from "@/lib/experiences/types";
import { GRAINS_CORRECT, GRAINS_FOUND } from "@/lib/experiences/texts";
import { answerExperienceRisk, finishExperience, revealExperienceRisks } from "@/lib/experience-actions";
import { LOGO_SRC } from "@/lib/theme";

// Fuente pixel libre (OFL) en lugar de Volter, que es de Sulake. Se sirve desde el propio
// dominio con next/font y solo se descarga en las páginas que usan el jugador.
const pixel = Pixelify_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-pixel" });

type Phase = "portada" | "intro" | "juego" | "completo" | "final" | "resumen";

interface Bubble {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface Toast {
  id: number;
  text: string;
  good: boolean;
}

interface Props {
  experience: PublicExperience;
  participant: string;
  initialResults: RiskResult[];
  mode: "play" | "preview";
  /** Solo en la vista previa del admin: textos completos para calificar sin guardar nada. */
  previewTexts?: Record<string, RiskTexts>;
  paused?: boolean;
  /** Salir: una Server Action (participante) o un enlace (vista previa del admin). */
  exitAction?: () => Promise<void>;
  exitHref?: string;
}

const OPTION_KEYS = ["A", "B", "C"];

/** Estaciones de la ruta del café: la 1 está lista y las siguientes se irán sumando. */
const STATIONS = [
  { n: 1, label: "La finca" },
  { n: 2, label: "Transporte" },
];

export default function ExperiencePlayer({
  experience,
  participant,
  initialResults,
  mode,
  previewTexts,
  paused,
  exitAction,
  exitHref,
}: Props) {
  const [scene, setScene] = useState<FincaScene | null>(null);
  const [phase, setPhase] = useState<Phase>("portada");
  const [moment, setMoment] = useState<Moment>(1);
  const [results, setResults] = useState<Map<string, RiskResult>>(() => new Map(initialResults.map((r) => [r.id, r])));
  const [ask, setAsk] = useState<{ riskId: string; side: "left" | "right"; zone: string } | null>(null);
  const [outcome, setOutcome] = useState<RiskResult | null>(null);
  const [pending, setPending] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [zoneList, setZoneList] = useState<Zone[] | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [muted, setMuted] = useState(false);
  const [maxHeight, setMaxHeight] = useState(560);
  const ids = useRef(0);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = experience.risks.length;
  const riskById = useMemo(() => new Map(experience.risks.map((r) => [r.id, r])), [experience.risks]);
  const found = results.size;
  const correct = [...results.values()].filter((r) => r.correct).length;
  const spotted = [...results.values()].filter((r) => r.chosen !== null).length;
  const grains = correct * GRAINS_CORRECT + (spotted - correct) * GRAINS_FOUND;
  const allDone = found >= total;

  useEffect(() => {
    const fit = () => setMaxHeight(Math.max(260, window.innerHeight - 150));
    fit();
    setMuted(sceneSound().muted);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Señales de peligro sobre los riesgos ya encontrados del momento visible.
  useEffect(() => {
    if (!scene) return;
    const marks: string[] = [];
    const seen = new Set<string>();
    for (const [zone, riskId] of Object.entries(FINCA_RISK_ZONES[moment])) {
      if (!results.has(riskId) || seen.has(riskId)) continue;
      seen.add(riskId);
      marks.push(zone);
    }
    scene.setFound(marks);
  }, [scene, moment, results]);

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  const showToast = useCallback((text: string, good = false) => {
    const id = ++ids.current;
    setToast({ id, text, good });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3400);
  }, []);

  const onSay = useCallback(
    (text: string) => {
      if (!scene) return;
      const p = scene.speaker();
      const id = ++ids.current;
      setBubbles((list) => [{ id, text, x: p.x, y: p.y }, ...list].slice(0, 3));
      sceneSound().play("pop");
      setTimeout(() => setBubbles((list) => list.filter((b) => b.id !== id)), 6500);
    },
    [scene],
  );

  function sfx(kind: Parameters<ReturnType<typeof sceneSound>["play"]>[0]) {
    sceneSound().play(kind);
  }

  function start() {
    if (!scene) return;
    sceneSound().unlock();
    sfx("open");
    if (allDone) {
      setPhase("completo");
      return;
    }
    setPhase("intro");
    setMoment(1);
    scene.playIntro(() => {
      setPhase("juego");
      showToast("Toca donde veas un error. Cambia de momento en la barra de abajo.");
    });
  }

  function skipIntro() {
    scene?.skipIntro(() => setPhase("juego"));
  }

  function replay() {
    if (!scene || phase !== "juego") return;
    closeWindows();
    setPhase("intro");
    setMoment(1);
    scene.playIntro(() => setPhase("juego"));
  }

  function goMoment(m: Moment) {
    if (!scene || phase !== "juego") return;
    if (scene.setMoment(m)) {
      setMoment(m);
      sfx("step");
    }
  }

  function closeWindows() {
    setAsk(null);
    setOutcome(null);
    setZoneList(null);
    setConfirmReveal(false);
  }

  function openZone(zone: Zone) {
    const riskId = FINCA_RISK_ZONES[moment][zone.id];
    const side = zone.x < 200 ? "right" : "left";
    if (riskId) {
      const done = results.get(riskId);
      sfx("open");
      if (done) setOutcome(done);
      else setAsk({ riskId, side, zone: zone.id });
      return;
    }
    sfx("ok");
    showToast(FINCA_OK[zone.id] ?? "Aquí todo está bien. Sigue buscando.");
  }

  function onTap(x: number, y: number, touch: boolean) {
    if (!scene || phase !== "juego" || scene.busy || ask || outcome || zoneList || confirmReveal) return;
    scene.ripple(x, y);
    const zone = scene.hitTest(x, y, touch ? 6 : 2);
    if (!zone) {
      sfx("tap");
      showToast("Aquí no hay nada raro. Mira a Ramiro, lo que carga y lo que lo rodea.");
      return;
    }
    openZone(zone);
  }

  async function choose(option: number) {
    if (!ask || pending) return;
    setPending(true);
    let result: RiskResult | null = null;
    if (mode === "preview" && previewTexts) {
      const t = previewTexts[ask.riskId];
      const risk = riskById.get(ask.riskId)!;
      result = {
        id: risk.id,
        category: risk.category,
        title: t.title,
        correct: option === t.correct,
        chosen: option,
        correctIndex: t.correct,
        explanation: t.explanation,
        practice: t.practice,
      };
    } else {
      const out = await answerExperienceRisk(ask.riskId, option);
      if (!out.ok) {
        setPending(false);
        setAsk(null);
        showToast(out.error);
        return;
      }
      result = out.result;
    }
    setPending(false);
    setResults((prev) => new Map(prev).set(result.id, result));
    setAsk(null);
    setOutcome(result);
    if (result.correct) {
      sfx("found");
      showToast(`¡Riesgo detectado! +${GRAINS_CORRECT} granos`, true);
    } else {
      sfx("wrong");
      showToast(`Lo encontraste, pero no era esa. +${GRAINS_FOUND} granos`);
    }
  }

  function closeOutcome() {
    setOutcome(null);
    if (results.size >= total && phase === "juego") {
      setPhase("completo");
      sfx("badge");
    }
  }

  function hint() {
    if (!scene || phase !== "juego") return;
    const here = [...risksInMoment(moment)].filter((id) => !results.has(id));
    if (here.length === 0) {
      const other = FINCA_MOMENTS.find((m) => [...risksInMoment(m.id)].some((id) => !results.has(id)));
      if (other) showToast(`En este momento ya encontraste todo. Prueba en "${other.id}. ${other.label}".`);
      return;
    }
    const riskId = here[Math.floor(Math.random() * here.length)];
    const zone = Object.entries(FINCA_RISK_ZONES[moment]).find(([, r]) => r === riskId)![0];
    scene.setHint(zone);
    sfx("ok");
    showToast("Mira donde brilla la estrella.");
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => scene.setHint(null), 5000);
  }

  function openZones() {
    if (!scene || phase !== "juego" || scene.busy) return;
    const seen = new Set<string>();
    const list = scene.zones().filter((z) => (seen.has(z.id) ? false : (seen.add(z.id), true)));
    setZoneList(list);
    sfx("open");
  }

  async function reveal() {
    setConfirmReveal(false);
    if (mode === "preview" && previewTexts) {
      setResults((prev) => {
        const next = new Map(prev);
        for (const r of experience.risks) {
          if (next.has(r.id)) continue;
          const t = previewTexts[r.id];
          next.set(r.id, {
            id: r.id,
            category: r.category,
            title: t.title,
            correct: false,
            chosen: null,
            correctIndex: t.correct,
            explanation: t.explanation,
            practice: t.practice,
          });
        }
        return next;
      });
    } else {
      const out = await revealExperienceRisks();
      if (!out.ok) {
        showToast(out.error);
        return;
      }
      setResults(new Map(out.results.map((r) => [r.id, r])));
    }
    setPhase("completo");
  }

  function playGood() {
    if (!scene) return;
    setPhase("final");
    closeWindows();
    scene.playGoodPractice(() => {
      setPhase("resumen");
      sfx("badge");
    });
  }

  function restartPreview() {
    if (!scene) return;
    setResults(new Map());
    setMoment(1);
    setBubbles([]);
    scene.reset();
    setPhase("portada");
  }

  function toggleSound() {
    const next = !muted;
    sceneSound().setMuted(next);
    setMuted(next);
    if (!next) {
      sceneSound().unlock();
      sfx("ok");
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (outcome) closeOutcome();
      else if (ask || zoneList || confirmReveal) closeWindows();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const askRisk = ask ? riskById.get(ask.riskId) : null;
  const windowOpen = !!(ask || outcome || zoneList || confirmReveal);
  const momentInfo = FINCA_MOMENTS.find((m) => m.id === moment)!;
  const sceneLabel = `Escena en pixel art: ${experience.character} en una finca cafetera de ladera. ${momentInfo.hint}`;

  return (
    <div className={`${styles.root} ${styles.pixel} ${pixel.variable}`}>
      <header className={styles.topbar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="Antídoto" className={styles.logo} />
        <div className={styles.roomInfo}>
          <span className={styles.roomDot} aria-hidden />
          <div style={{ minWidth: 0 }}>
            <div className={styles.roomName}>
              {experience.series} · Estación {experience.station}: {experience.title}
            </div>
            <div className={styles.roomSub}>
              {experience.tag.charAt(0) + experience.tag.slice(1).toLowerCase()} · {mode === "preview" ? "Vista previa" : participant}
            </div>
          </div>
        </div>
        <div className={styles.spacer} />
        <div className={styles.purse} aria-label={`${grains} granos de café, ${found} de ${total} riesgos`}>
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
        <button type="button" className={styles.iconButton} onClick={toggleSound} aria-label={muted ? "Activar sonido" : "Silenciar"}>
          <PixelIcon name={muted ? "mudo" : "sonido"} size={18} />
        </button>
        {exitAction ? (
          <form action={exitAction}>
            <button type="submit" className={styles.iconButton}>
              <PixelIcon name="puerta" size={14} /> Salir
            </button>
          </form>
        ) : exitHref ? (
          <Link href={exitHref} className={styles.iconButton}>
            <PixelIcon name="puerta" size={14} /> Salir
          </Link>
        ) : null}
      </header>

      <main className={styles.main}>
        <div className={styles.stageCol}>
          <div className={styles.stageFrame}>
            <SceneCanvas onScene={setScene} onSay={onSay} onTap={onTap} maxHeight={maxHeight} label={sceneLabel}>
              <div className={styles.overlay}>
                {bubbles.map((b, i) => (
                  <div
                    key={b.id}
                    className={`${styles.bubble} ${i > 0 ? styles.bubbleOld : ""}`}
                    style={{
                      left: `${Math.min(80, Math.max(20, (b.x / 400) * 100))}%`,
                      top: `calc(${Math.max(14, (b.y / 250) * 100)}% - ${i * 36}px)`,
                      opacity: i === 0 ? 1 : 0.75 - i * 0.2,
                    }}
                  >
                    <span className={styles.bubbleHead}>
                      <PixelIcon name="ramiro" size={18} />
                    </span>
                    <span>
                      <b>{experience.character}:</b> {b.text}
                    </span>
                  </div>
                ))}

                {toast && (
                  <div key={toast.id} role="status" className={`${styles.toast} ${toast.good ? styles.toastGood : ""}`}>
                    <PixelIcon name={toast.good ? "grano" : "pista"} size={18} />
                    <span>{toast.text}</span>
                  </div>
                )}

                {phase === "portada" && (
                  <>
                    <div className={styles.dim} />
                    <section className={`${styles.window} ${styles.dialogCenter}`} role="dialog" aria-labelledby="xp-cover-title">
                      <div className={styles.winHead}>
                        <span className={styles.winTitle}>{experience.tag.charAt(0) + experience.tag.slice(1).toLowerCase()}</span>
                      </div>
                      <div className={styles.winBody}>
                        <span className={styles.coverKicker}>
                          {experience.series.toUpperCase()} · ESTACIÓN {experience.station}
                        </span>
                        <h1 id="xp-cover-title" className={styles.coverTitle}>
                          {experience.title}
                        </h1>
                        <p>
                          {mode === "preview" ? "Vista previa: nada de lo que respondas se guarda." : `¡Hola, ${participant}!`} {experience.description}
                        </p>
                        <ol className={styles.steps}>
                          <li>
                            <PixelIcon name="repetir" size={16} /> Mira lo que hace {experience.character}.
                          </li>
                          <li>
                            <PixelIcon name="riesgo" size={16} /> Toca donde veas un error: son {total}.
                          </li>
                          <li>
                            <PixelIcon name="check" size={16} /> Elige qué está mal y gana granos de café.
                          </li>
                        </ol>
                        <div className={styles.stations} aria-label="Estaciones de la ruta">
                          {STATIONS.map((s) => (
                            <span key={s.n} className={`${styles.station} ${s.n === experience.station ? styles.stationOn : styles.stationOff}`}>
                              {s.n !== experience.station && <PixelIcon name="candado" size={11} />}
                              {s.n}. {s.label}
                            </span>
                          ))}
                          <span className={`${styles.station} ${styles.stationOff}`}>y más...</span>
                        </div>
                        {paused && mode === "play" ? (
                          <p style={{ color: "#a66b00", fontWeight: 700 }}>Esta actividad está pausada por tu administrador.</p>
                        ) : (
                          <button type="button" autoFocus className={`${styles.button} ${styles.go}`} onClick={start} disabled={!scene}>
                            {allDone ? "Ver cómo se hace bien" : found > 0 ? `Continuar (${found}/${total})` : "Entrar a la finca"}
                          </button>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {askRisk && ask && (
                  <section
                    className={`${styles.window} ${styles.questionWin}`}
                    style={ask.side === "right" ? { right: 12 } : { left: 12 }}
                    role="dialog"
                    aria-labelledby="xp-ask-title"
                  >
                    <div className={styles.winHead}>
                      <span className={styles.winTitle} id="xp-ask-title">
                        {FINCA_ZONE_LABELS[ask.zone] ?? "¿Qué ves?"}
                      </span>
                      <button type="button" className={styles.close} onClick={() => setAsk(null)} aria-label="Cerrar">
                        ✕
                      </button>
                    </div>
                    <div className={styles.winBody}>
                      <p style={{ fontWeight: 700 }}>{askRisk.prompt}</p>
                      {askRisk.options.map((o, i) => (
                        <button
                          key={i}
                          type="button"
                          autoFocus={i === 0}
                          className={`${styles.button} ${styles.option}`}
                          onClick={() => choose(i)}
                          disabled={pending}
                        >
                          <span className={styles.optionKey}>{OPTION_KEYS[i]}</span>
                          <span>{o}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {outcome && (
                  <section
                    className={`${styles.window} ${styles.questionWin}`}
                    style={{ right: 12 }}
                    role="dialog"
                    aria-labelledby="xp-outcome-title"
                  >
                    <div className={`${styles.winHead} ${outcome.correct ? styles.winHeadGood : styles.winHeadWarn}`}>
                      <span className={styles.winTitle} id="xp-outcome-title">
                        {outcome.chosen === null ? "Este se te pasó" : outcome.correct ? "¡Bien visto!" : "Casi: no era esa"}
                      </span>
                      <button type="button" className={styles.close} onClick={closeOutcome} aria-label="Cerrar">
                        ✕
                      </button>
                    </div>
                    <div className={styles.winBody}>
                      <span className={styles.tag}>RIESGO {outcome.category.toUpperCase()}</span>
                      <p style={{ fontWeight: 700, fontSize: 17 }}>{outcome.title}</p>
                      {outcome.chosen !== null && !outcome.correct && (
                        <p className={styles.muted}>
                          Elegiste la {OPTION_KEYS[outcome.chosen]}. La correcta era la {OPTION_KEYS[outcome.correctIndex]}.
                        </p>
                      )}
                      <p>{outcome.explanation}</p>
                      <div className={styles.practice}>
                        <PixelIcon name="check" size={18} />
                        <span>
                          <b>Así sí:</b> {outcome.practice}
                        </span>
                      </div>
                      <button type="button" autoFocus className={`${styles.button} ${styles.primary}`} onClick={closeOutcome}>
                        {results.size >= total && phase === "juego" ? "Terminar la búsqueda" : "Seguir buscando"}
                      </button>
                    </div>
                  </section>
                )}

                {zoneList && (
                  <>
                    <div className={styles.dim} onClick={() => setZoneList(null)} />
                    <section className={`${styles.window} ${styles.dialogCenter}`} role="dialog" aria-labelledby="xp-zones-title">
                      <div className={styles.winHead}>
                        <span className={styles.winTitle} id="xp-zones-title">
                          Zonas del momento {moment}
                        </span>
                        <button type="button" className={styles.close} onClick={() => setZoneList(null)} aria-label="Cerrar">
                          ✕
                        </button>
                      </div>
                      <div className={styles.winBody}>
                        <p className={styles.muted}>Elige qué quieres revisar de cerca.</p>
                        <div className={styles.zoneGrid}>
                          {zoneList.map((z, i) => (
                            <button
                              key={z.id}
                              type="button"
                              autoFocus={i === 0}
                              className={styles.button}
                              onClick={() => {
                                setZoneList(null);
                                scene?.ripple(z.x, z.y);
                                openZone(z);
                              }}
                            >
                              {FINCA_ZONE_LABELS[z.id] ?? z.id}
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {confirmReveal && (
                  <>
                    <div className={styles.dim} onClick={() => setConfirmReveal(false)} />
                    <section className={`${styles.window} ${styles.dialogCenter}`} role="dialog" aria-labelledby="xp-reveal-title">
                      <div className={`${styles.winHead} ${styles.winHeadWarn}`}>
                        <span className={styles.winTitle} id="xp-reveal-title">
                          ¿Ver los que faltan?
                        </span>
                        <button type="button" className={styles.close} onClick={() => setConfirmReveal(false)} aria-label="Cerrar">
                          ✕
                        </button>
                      </div>
                      <div className={styles.winBody}>
                        <p>
                          Te faltan {total - found} de {total}. Si los ves ahora, cuentan como no encontrados. Prueba antes con una pista o en otro
                          momento de la escena.
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" autoFocus className={`${styles.button} ${styles.primary}`} onClick={() => setConfirmReveal(false)}>
                            Sigo buscando
                          </button>
                          <button type="button" className={styles.button} onClick={reveal}>
                            Ver los que faltan
                          </button>
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {phase === "completo" && !outcome && (
                  <>
                    <div className={styles.dim} />
                    <section className={`${styles.window} ${styles.dialogCenter}`} role="dialog" aria-labelledby="xp-done-title">
                      <div className={`${styles.winHead} ${styles.winHeadGood}`}>
                        <span className={styles.winTitle} id="xp-done-title">
                          {spotted === total ? `¡Encontraste los ${total} riesgos!` : "Estos eran los riesgos"}
                        </span>
                      </div>
                      <div className={styles.winBody}>
                        <p>
                          {spotted === total
                            ? `Tienes ojo de inspector: ${correct} de ${total} a la primera.`
                            : `Encontraste ${spotted} de ${total}. Revisa en el panel los que se te pasaron.`}{" "}
                          Ahora mira a {experience.character} hacerlo bien.
                        </p>
                        <button type="button" autoFocus className={`${styles.button} ${styles.go}`} onClick={playGood}>
                          Ver cómo se hace bien
                        </button>
                      </div>
                    </section>
                  </>
                )}

                {phase === "resumen" && (
                  <>
                    <div className={styles.dim} />
                    <section className={`${styles.window} ${styles.dialogCenter}`} role="dialog" aria-labelledby="xp-end-title">
                      <div className={`${styles.winHead} ${styles.winHeadGood}`}>
                        <span className={styles.winTitle} id="xp-end-title">
                          ¡Estación completada!
                        </span>
                      </div>
                      <div className={styles.winBody}>
                        <div className={styles.badgeBig}>
                          <PixelIcon name="insignia" size={72} title="Insignia Recolector seguro" />
                        </div>
                        <p style={{ textAlign: "center", fontWeight: 700 }}>Insignia: Recolector seguro</p>
                        <div className={styles.stats}>
                          <div className={styles.stat}>
                            <div className={styles.statValue}>
                              {spotted}/{total}
                            </div>
                            <div className={styles.statLabel}>encontrados</div>
                          </div>
                          <div className={styles.stat}>
                            <div className={styles.statValue}>{correct}</div>
                            <div className={styles.statLabel}>a la primera</div>
                          </div>
                          <div className={styles.stat}>
                            <div className={styles.statValue}>{grains}</div>
                            <div className={styles.statLabel}>granos</div>
                          </div>
                        </div>
                        <p className={styles.muted}>
                          Próxima estación de la ruta: <b>transporte y conducción</b>. Muy pronto.
                        </p>
                        {mode === "play" ? (
                          <form action={finishExperience}>
                            <button type="submit" autoFocus className={`${styles.button} ${styles.go}`} style={{ width: "100%" }}>
                              Terminar
                            </button>
                          </form>
                        ) : (
                          <button type="button" autoFocus className={`${styles.button} ${styles.go}`} onClick={restartPreview}>
                            Volver a empezar
                          </button>
                        )}
                        <button type="button" className={styles.button} onClick={playGood}>
                          Ver otra vez la forma correcta
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </SceneCanvas>
          </div>

          <nav className={styles.toolbar} aria-label="Controles de la escena">
            {phase === "intro" ? (
              <>
                <button type="button" className={styles.iconButton} onClick={skipIntro}>
                  Saltar la historia ▸▸
                </button>
                <span className={styles.toolbarHint}>Mira lo que hace {experience.character}...</span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={replay}
                  disabled={phase !== "juego"}
                  title="Ver la historia de nuevo"
                  aria-label="Ver la historia de nuevo"
                >
                  <PixelIcon name="repetir" size={16} />
                </button>
                <div className={styles.moments} role="group" aria-label="Momentos de la escena">
                  {FINCA_MOMENTS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.moment} ${moment === m.id ? styles.momentOn : ""}`}
                      aria-pressed={moment === m.id}
                      onClick={() => goMoment(m.id)}
                      disabled={phase !== "juego"}
                      title={m.hint}
                    >
                      <span className={styles.momentNum}>{m.id}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
                <button type="button" className={styles.iconButton} onClick={hint} disabled={phase !== "juego" || windowOpen}>
                  <PixelIcon name="pista" size={16} /> Pista
                </button>
                <button type="button" className={styles.iconButton} onClick={openZones} disabled={phase !== "juego" || windowOpen}>
                  <PixelIcon name="zonas" size={16} /> Zonas
                </button>
                <span className={styles.toolbarHint}>{momentInfo.hint}</span>
              </>
            )}
          </nav>
        </div>

        <aside className={styles.quest}>
          <section className={styles.window} aria-labelledby="xp-quest-title">
            <div className={styles.winHead}>
              <PixelIcon name="riesgo" size={16} />
              <span className={styles.winTitle} id="xp-quest-title">
                Riesgos · {found}/{total}
              </span>
            </div>
            <div className={styles.winBody}>
              <div className={styles.progress} aria-hidden>
                <div className={styles.progressFill} style={{ width: `${(found / total) * 100}%` }} />
              </div>
              <ul className={styles.questList}>
                {experience.risks.map((r) => {
                  const res = results.get(r.id);
                  if (!res) {
                    return (
                      <li key={r.id}>
                        <div className={`${styles.questItem} ${styles.questLocked}`}>
                          <span className={styles.questBadge} style={{ background: "#c6d6dc", borderColor: "#9fb8c2" }}>
                            <PixelIcon name="candado" size={14} />
                          </span>
                          <span className={styles.questText}>
                            ???
                            <span className={styles.questCat}>Por encontrar</span>
                          </span>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={styles.questItem}
                        onClick={() => {
                          if (phase === "juego" || phase === "completo" || phase === "resumen") setOutcome(res);
                        }}
                      >
                        <span className={styles.questBadge}>
                          <PixelIcon name="riesgo" size={18} />
                        </span>
                        <span className={styles.questText}>
                          {res.title}
                          <span className={styles.questCat}>
                            {res.category} · {res.chosen === null ? "no lo encontraste" : res.correct ? "a la primera" : "con ayuda"}
                          </span>
                        </span>
                        <PixelIcon name={res.correct ? "check" : "cruz"} size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {phase === "juego" && found < total && (
                <button type="button" className={styles.button} onClick={() => setConfirmReveal(true)} disabled={windowOpen}>
                  Ya no encuentro más
                </button>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
