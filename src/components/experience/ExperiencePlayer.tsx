"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tiny5 } from "next/font/google";
import styles from "./player.module.css";
import SceneCanvas from "./SceneCanvas";
import PixelIcon from "./PixelIcon";
import { sceneSound } from "./sound";
import { SCENE_MAPS } from "./scenes";
import TopBar from "./TopBar";
import RouteHub from "./RouteHub";
import { routeProgress, type Results } from "./progress";
import { risksInMoment, type Moment, type PlayScene, type Zone } from "./scenes/types";
import type { PublicExperience, RiskResult, RiskTexts } from "@/lib/experiences/types";
import { GRAINS_CORRECT, GRAINS_FOUND } from "@/lib/experiences/texts";
import { answerExperienceRisk, finishExperience, revealExperienceRisks } from "@/lib/experience-actions";
import { brandPalette, INK, mix, type PublicBrand } from "@/lib/brand-palette";
import type { ProfileConfig } from "@/lib/profile";

// Fuente pixel libre (OFL) en lugar de Volter, que es de Sulake: Tiny5 es la más parecida
// y se lee nítida desde 16 px. Se sirve desde el propio dominio con next/font y solo se
// descarga en las páginas que usan el jugador.
const pixel = Tiny5({ subsets: ["latin"], weight: "400", variable: "--font-pixel" });

type Phase = "cargando" | "intro" | "juego" | "completo" | "final" | "resumen";

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
  /** Las estaciones de la serie que se juegan con el código, en orden. */
  stations: PublicExperience[];
  participant: string;
  initialResults: RiskResult[];
  mode: "play" | "preview";
  /** Solo en la vista previa del admin: textos completos para calificar sin guardar nada. */
  previewTexts?: Record<string, RiskTexts>;
  paused?: boolean;
  /** Salir: una Server Action (participante) o un enlace (vista previa del admin). */
  exitAction?: () => Promise<void>;
  exitHref?: string;
  /** Marca de la empresa del código; sin ella, la de Antídoto. */
  brand?: PublicBrand | null;
  /** Nombre de la empresa del código, para la bienvenida. */
  company?: string | null;
  /** Si ya vio la bienvenida y qué datos pide el código en la ficha. */
  onboarding: { done: boolean; config: ProfileConfig | null };
}

const OPTION_KEYS = ["A", "B", "C"];

/** Pasos del tutorial de la primera estación; el último es la práctica (la escena queda tocable). */
const COACH_STEPS = 5;

/** El tutorial sale una vez por navegador; sin almacenamiento, sale siempre que no haya avance. */
const TUTORIAL_KEY = "antidoto:tutorial-escena";

function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {
    // Sin almacenamiento (ventana privada): no pasa nada, solo se repetiría.
  }
}

type View = { kind: "mapa"; celebrate: number | null } | { kind: "estacion"; index: number; wasDone: boolean; tutorial: boolean };

/**
 * La serie se juega desde el mapa de la ruta: la primera vez Ramiro da la bienvenida (y
 * se llena la ficha, si el código la pide); desde ahí se entra a cada estación, que se
 * abre al terminar la anterior. Las respuestas de todas las estaciones viven aquí.
 */
export default function ExperiencePlayer(props: Props) {
  const { stations, initialResults, brand, onboarding } = props;
  const [results, setResults] = useState<Results>(() => new Map(initialResults.map((r) => [r.id, r])));
  const [view, setView] = useState<View>({ kind: "mapa", celebrate: null });
  const [welcomeOpen, setWelcomeOpen] = useState(!onboarding.done);
  const [onboarded, setOnboarded] = useState(onboarding.done);

  function enter(index: number) {
    const prog = routeProgress(stations, results);
    setView({
      kind: "estacion",
      index,
      wasDone: prog.done[index],
      tutorial: index === 0 && results.size === 0 && !tutorialSeen(),
    });
  }

  function backToMap() {
    if (view.kind !== "estacion") return;
    const nowDone = routeProgress(stations, results).done[view.index];
    setView({ kind: "mapa", celebrate: !view.wasDone && nowDone ? view.index : null });
  }

  function restart() {
    setResults(new Map());
    setView({ kind: "mapa", celebrate: null });
  }

  return (
    <div className={`${styles.root} ${pixel.variable}`} style={brand ? brandSkin(brand) : undefined}>
      {view.kind === "mapa" ? (
        <RouteHub
          stations={stations}
          results={results}
          participant={props.participant}
          company={props.company ?? null}
          brand={brand}
          mode={props.mode}
          paused={props.paused}
          exitAction={props.exitAction}
          exitHref={props.exitHref}
          welcomeOpen={welcomeOpen}
          profileConfig={onboarding.config}
          onboarded={onboarded}
          celebrate={view.celebrate}
          onWelcomeDone={() => {
            setWelcomeOpen(false);
            setOnboarded(true);
          }}
          onReplayWelcome={() => setWelcomeOpen(true)}
          onEnter={enter}
          onRestart={restart}
        />
      ) : (
        <StationPlayer
          key={stations[view.index].key}
          {...props}
          experience={stations[view.index]}
          results={results}
          setResults={setResults}
          tutorial={view.tutorial}
          onBack={backToMap}
          onRestart={restart}
        />
      )}
    </div>
  );
}

interface StationProps extends Props {
  experience: PublicExperience;
  results: Results;
  setResults: React.Dispatch<React.SetStateAction<Results>>;
  /** Primera vez en la ruta: Ramiro enseña los controles antes de buscar. */
  tutorial: boolean;
  /** Vuelve al mapa de la ruta. */
  onBack: () => void;
  onRestart: () => void;
}

function StationPlayer({
  stations,
  experience,
  participant,
  mode,
  previewTexts,
  exitAction,
  exitHref,
  brand,
  results,
  setResults,
  tutorial,
  onBack,
  onRestart,
}: StationProps) {
  const map = SCENE_MAPS[experience.scene];
  const [scene, setScene] = useState<PlayScene | null>(null);
  const [phase, setPhase] = useState<Phase>("cargando");
  const [moment, setMoment] = useState<Moment>(1);
  const [ask, setAsk] = useState<{ riskId: string; side: "left" | "right"; zone: string } | null>(null);
  const [outcome, setOutcome] = useState<RiskResult | null>(null);
  const [pending, setPending] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [zoneList, setZoneList] = useState<Zone[] | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  // Paso del tutorial; null = sin tutorial o ya terminado.
  const [coach, setCoach] = useState<number | null>(null);
  const questRef = useRef<HTMLElement>(null);
  const [maxHeight, setMaxHeight] = useState(560);
  const ids = useRef(0);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const laterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Ayuda que llega sola: nivel 0 = aún no se ha dado ninguna, 1 = estrella, 2 = estrella y pista escrita.
  const helpLevel = useRef(0);
  const misses = useRef(0);
  const autoHelpRef = useRef<() => void>(() => {});
  // Cada toque o cambio de momento reinicia la espera antes de ayudar.
  const [activity, setActivity] = useState(0);
  // Momento cuya pestaña late porque ahí quedan riesgos por encontrar.
  const [nudge, setNudge] = useState<Moment | null>(null);
  // Riesgo del panel cuya pista escrita está abierta.
  const [clueRisk, setClueRisk] = useState<string | null>(null);

  const total = experience.risks.length;
  const riskById = useMemo(() => new Map(experience.risks.map((r) => [r.id, r])), [experience.risks]);
  // Contadores de esta estación; los granos se acumulan en toda la ruta.
  const mine = experience.risks.map((r) => results.get(r.id)).filter((r): r is RiskResult => !!r);
  const found = mine.length;
  const correct = mine.filter((r) => r.correct).length;
  const spotted = mine.filter((r) => r.chosen !== null).length;
  const { grains } = routeProgress(stations, results);
  const allDone = found >= total;
  const next = stations[stations.indexOf(experience) + 1] ?? null;
  // Cuántos riesgos se pueden encontrar en cada momento (un riesgo puede verse en varios).
  const momentStats = map.moments.map((m) => {
    const ids = [...risksInMoment(map, m.id)];
    return { id: m.id, total: ids.length, found: ids.filter((id) => results.has(id)).length };
  });
  const here = momentStats.find((m) => m.id === moment)!;
  const coaching = coach !== null && coach < COACH_STEPS - 1;
  const windowOpen = !!(ask || outcome || zoneList || confirmReveal || coaching);

  useEffect(() => {
    const fit = () => setMaxHeight(Math.max(260, window.innerHeight - 150));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Señales de peligro sobre los riesgos ya encontrados del momento visible.
  useEffect(() => {
    if (!scene) return;
    const marks: string[] = [];
    const seen = new Set<string>();
    for (const [zone, riskId] of Object.entries(map.riskZones[moment])) {
      if (!results.has(riskId) || seen.has(riskId)) continue;
      seen.add(riskId);
      marks.push(zone);
    }
    scene.setFound(marks);
  }, [scene, moment, results, map]);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (waitTimer.current) clearInterval(waitTimer.current);
      if (laterTimer.current) clearTimeout(laterTimer.current);
    },
    [],
  );

  useEffect(() => {
    autoHelpRef.current = autoHelp;
  });

  // Ayuda que llega sola: si pasa un rato sin tocar nada, la escena ayuda sin que nadie la pida.
  useEffect(() => {
    if (phase !== "juego" || !scene || windowOpen || coach !== null || found >= total) return;
    const t = setTimeout(() => autoHelpRef.current(), helpLevel.current === 0 ? 15000 : 12000);
    return () => clearTimeout(t);
  }, [phase, scene, windowOpen, coach, found, total, moment, activity]);

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

  /** Al montar la escena: la historia arranca sola (se entró desde el mapa con un clic). */
  function begin(sc: PlayScene) {
    setScene(sc);
    if (allDone) {
      setPhase("completo");
      return;
    }
    setPhase("intro");
    setMoment(1);
    sc.playIntro(startSearch);
  }

  function startSearch() {
    setPhase("juego");
    if (tutorial) setCoach(0);
    else showToast(map.start);
  }

  function skipIntro() {
    setBubbles([]);
    scene?.skipIntro(startSearch);
  }

  const coachSteps = [
    `Esta es la escena. Aquí hay ${total} errores escondidos en lo que hace ${experience.character}.`,
    "La historia tiene 3 momentos: cámbialos aquí abajo. El número de cada uno dice cuántos errores llevas encontrados ahí.",
    "¿Sin ideas? Espera un momento y una estrella te ayuda sola. También puedes usar Pista y Zonas.",
    "En este panel está la lista de riesgos. Toca uno con la bombilla para ver una pista de dónde mirar.",
    "Ahora tú: toca donde brilla la estrella.",
  ];
  const coachSpot = coach === null ? null : (["stage", "moments", "help", "quest", "stage"] as const)[coach];
  // Mientras Ramiro explica no se puede tocar la escena; en el último paso, sí.

  function coachNext() {
    if (coach === null) return;
    const to = coach + 1;
    sfx("pop");
    if (coachSpot === "help") questRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (to === coachSteps.length - 1 && scene) {
      const zone = Object.entries(map.riskZones[moment]).find(([, r]) => !results.has(r))?.[0];
      if (zone) scene.setHint(zone);
    }
    setCoach(to);
  }

  function endCoach() {
    setCoach(null);
    markTutorialSeen();
    scene?.setHint(null);
  }

  function replay() {
    if (!scene || phase !== "juego") return;
    closeWindows();
    setBubbles([]);
    setPhase("intro");
    setMoment(1);
    scene.playIntro(() => setPhase("juego"));
  }

  function goMoment(m: Moment) {
    if (!scene || phase !== "juego") return;
    if (scene.setMoment(m)) {
      setMoment(m);
      setNudge(null);
      setActivity((a) => a + 1);
      sfx("step");
    }
  }

  /** El momento donde se puede ver el riesgo: el actual si ahí está, si no el primero que lo tenga. */
  function momentWith(riskId: string): Moment {
    if (risksInMoment(map, moment).has(riskId)) return moment;
    return map.moments.find((m) => risksInMoment(map, m.id).has(riskId))?.id ?? moment;
  }

  /** Enciende la estrella sobre el riesgo; si está en otro momento, cambia a ese momento primero. */
  function showStar(riskId: string, seconds = 6) {
    if (!scene) return;
    const target = momentWith(riskId);
    const apply = () => {
      const zone = Object.entries(map.riskZones[target]).find(([, r]) => r === riskId)?.[0];
      if (!zone) return;
      scene.setHint(zone);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => scene.setHint(null), seconds * 1000);
    };
    if (target === moment) return apply();
    if (!scene.setMoment(target)) return;
    setMoment(target);
    setNudge(null);
    sfx("step");
    // El cambio de momento se anima: la estrella sale cuando la escena queda quieta.
    if (waitTimer.current) clearInterval(waitTimer.current);
    let tries = 0;
    waitTimer.current = setInterval(() => {
      if (!scene.busy || ++tries > 40) {
        if (waitTimer.current) clearInterval(waitTimer.current);
        apply();
      }
    }, 150);
  }

  /** La escena ayuda sola: estrella sobre un riesgo pendiente y, si sigue sin salir, también la pista escrita. */
  function autoHelp() {
    if (!scene || phase !== "juego") return;
    // Si la escena está en medio de una animación, se vuelve a intentar en un rato.
    if (scene.busy) return setActivity((a) => a + 1);
    helpLevel.current = Math.min(2, helpLevel.current + 1);
    const pending = [...risksInMoment(map, moment)].find((id) => !results.has(id));
    if (pending) {
      showStar(pending, helpLevel.current >= 2 ? 10 : 6);
      showToast(helpLevel.current >= 2 ? `Pista: ${riskById.get(pending)!.clue}` : "Mira donde brilla la estrella.");
    } else {
      const other = map.moments.find((m) => [...risksInMoment(map, m.id)].some((id) => !results.has(id)));
      if (other) {
        setNudge(other.id);
        showToast(`Aquí ya encontraste todo. Mira el momento ${other.id}: ${other.label}.`);
      }
    }
    sfx("ok");
    setActivity((a) => a + 1);
  }

  /** Pista escrita desde el panel: dice dónde mirar y hace brillar la zona. */
  function openClue(riskId: string) {
    sfx("open");
    if (clueRisk === riskId) {
      setClueRisk(null);
      return;
    }
    setClueRisk(riskId);
    if (phase === "juego" && !windowOpen && scene && !scene.busy) {
      showStar(riskId, 8);
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /** Un riesgo pendiente del momento actual queda cerca del toque (para decir "estás cerca"). */
  function nearPending(x: number, y: number): boolean {
    if (!scene) return false;
    return scene.zones().some((z) => {
      const riskId = map.riskZones[moment][z.id];
      return !!riskId && !results.has(riskId) && Math.hypot(z.x - x, z.y - y) <= z.r + 34;
    });
  }

  function closeWindows() {
    setAsk(null);
    setOutcome(null);
    setZoneList(null);
    setConfirmReveal(false);
  }

  function openZone(zone: Zone) {
    const riskId = map.riskZones[moment][zone.id];
    const side = zone.x < 200 ? "right" : "left";
    if (riskId) {
      if (coach !== null) endCoach();
      const done = results.get(riskId);
      sfx("open");
      if (done) setOutcome(done);
      else setAsk({ riskId, side, zone: zone.id });
      return;
    }
    sfx("ok");
    showToast(map.ok[zone.id] ?? "Aquí todo está bien. Sigue buscando.");
  }

  function onTap(x: number, y: number, touch: boolean) {
    if (!scene || phase !== "juego" || scene.busy || ask || outcome || zoneList || confirmReveal || coaching) return;
    scene.ripple(x, y);
    setActivity((a) => a + 1);
    setNudge(null);
    // Con el dedo la zona de toque es más generosa que con el mouse.
    const zone = scene.hitTest(x, y, touch ? 11 : 3);
    const hitsRisk = !!zone && !!map.riskZones[moment][zone.id];
    if (hitsRisk) misses.current = 0;
    else misses.current++;
    const stuck = misses.current >= 3;
    if (stuck) misses.current = 0;
    if (!zone) {
      sfx("tap");
      if (stuck) autoHelp();
      else showToast(nearPending(x, y) ? "¡Estás cerca! Mira un poco más por aquí." : map.miss);
      return;
    }
    openZone(zone);
    // Tras varios toques en zonas donde todo está bien, la ayuda llega después de leer el aviso.
    if (stuck && !hitsRisk) {
      if (laterTimer.current) clearTimeout(laterTimer.current);
      laterTimer.current = setTimeout(() => autoHelpRef.current(), 2600);
    }
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
    helpLevel.current = 0;
    misses.current = 0;
    setClueRisk(null);
    scene?.setHint(null);
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
    if (found >= total && phase === "juego") {
      setPhase("completo");
      sfx("badge");
    }
  }

  function hint() {
    if (!scene || phase !== "juego") return;
    const here = [...risksInMoment(map, moment)].filter((id) => !results.has(id));
    if (here.length === 0) {
      const other = map.moments.find((m) => [...risksInMoment(map, m.id)].some((id) => !results.has(id)));
      if (other) showToast(`En este momento ya encontraste todo. Prueba en "${other.id}. ${other.label}".`);
      return;
    }
    const riskId = here[Math.floor(Math.random() * here.length)];
    const zone = Object.entries(map.riskZones[moment]).find(([, r]) => r === riskId)![0];
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
      const out = await revealExperienceRisks(experience.key);
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
    setBubbles([]);
    scene.playGoodPractice(() => {
      setPhase("resumen");
      sfx("badge");
    });
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
  const momentInfo = map.moments.find((m) => m.id === moment)!;
  const sceneLabel = `Escena en pixel art: ${map.place} ${momentInfo.hint}`;

  return (
    <>
      <TopBar
        brand={brand}
        title={`${experience.series} · Estación ${experience.station}: ${experience.title}`}
        sub={`${experience.tag.charAt(0) + experience.tag.slice(1).toLowerCase()} · ${mode === "preview" ? "Vista previa" : participant}`}
        grains={grains}
        found={found}
        total={total}
        onMap={onBack}
        exitAction={exitAction}
        exitHref={exitHref}
      />

      <main className={styles.main}>
        <div className={styles.stageCol}>
          <div ref={stageRef} className={`${styles.stageFrame} ${coachSpot === "stage" ? styles.spot : ""}`}>
            <SceneCanvas sceneKey={experience.scene} onScene={begin} onSay={onSay} onTap={onTap} maxHeight={maxHeight} label={sceneLabel}>
              <div className={styles.overlay}>
                {bubbles.map((b, i) => (
                  // Como en Habbo: la burbuja nueva aparece sobre el que habla y empuja
                  // hacia arriba a las anteriores, que se van apagando.
                  <div
                    key={b.id}
                    className={`${styles.bubble} ${i > 0 ? styles.bubbleOld : ""}`}
                    style={{
                      left: `${Math.min(78, Math.max(22, (bubbles[0].x / 400) * 100))}%`,
                      top: `${Math.max(16, (bubbles[0].y / 250) * 100)}%`,
                      transform: `translate(-50%, calc(-100% - ${i * 40}px))`,
                      opacity: i === 0 ? 1 : 0.8 - i * 0.25,
                    }}
                  >
                    <span className={styles.bubbleHead}>
                      <PixelIcon name={map.speaker} size={18} />
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

                {phase === "cargando" && <div className={styles.dim} />}

                {coach !== null && (
                  <section className={`${styles.window} ${styles.coach}`} role="dialog" aria-label="Tutorial" aria-live="polite">
                    <div className={styles.talkFace} aria-hidden>
                      <PixelIcon name={map.speaker} size={40} />
                    </div>
                    <div className={styles.talkBody}>
                      <div className={styles.talkName}>
                        {experience.character} · {coach + 1}/{coachSteps.length}
                      </div>
                      <p className={styles.talkText}>{coachSteps[coach]}</p>
                      <div className={styles.talkActions}>
                        <button type="button" className={styles.textButton} onClick={endCoach}>
                          Saltar tutorial
                        </button>
                        {coaching && (
                          <button type="button" autoFocus className={`${styles.button} ${styles.primary}`} onClick={coachNext}>
                            Sigue ▸
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
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
                        {map.zoneLabels[ask.zone] ?? "¿Qué ves?"}
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
                        {found >= total && phase === "juego" ? "Terminar la búsqueda" : "Seguir buscando"}
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
                              {map.zoneLabels[z.id] ?? z.id}
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
                    <section
                      className={`${styles.window} ${styles.dialogCenter}`}
                      role="dialog"
                      aria-labelledby="xp-reveal-title"
                    >
                      <div className={`${styles.winHead} ${styles.winHeadWarn}`}>
                        <span className={styles.winTitle} id="xp-reveal-title">
                          ¿Ver los que faltan?
                        </span>
                        <button
                          type="button"
                          className={styles.close}
                          onClick={() => setConfirmReveal(false)}
                          aria-label="Cerrar"
                        >
                          ✕
                        </button>
                      </div>
                      <div className={styles.winBody}>
                        <p>
                          Te faltan {total - found} de {total}. Si los ves ahora, cuentan como no encontrados. Prueba antes con
                          una pista o en otro momento de la escena.
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            autoFocus
                            className={`${styles.button} ${styles.primary}`}
                            onClick={() => setConfirmReveal(false)}
                          >
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
                          <PixelIcon name="insignia" size={72} title={`Insignia ${experience.badge}`} />
                        </div>
                        <p style={{ textAlign: "center", fontWeight: 700 }}>Insignia: {experience.badge}</p>
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
                          {next ? (
                            <>
                              Desbloqueaste la estación {next.station}: <b>{next.title}</b>.
                            </>
                          ) : (
                            `¡Completaste la ${experience.series}, de principio a fin!`
                          )}
                        </p>
                        {!next && mode === "play" ? (
                          <form action={finishExperience}>
                            <button type="submit" autoFocus className={`${styles.button} ${styles.go}`} style={{ width: "100%" }}>
                              Terminar la ruta
                            </button>
                          </form>
                        ) : (
                          <button type="button" autoFocus className={`${styles.button} ${styles.go}`} style={{ width: "100%" }} onClick={onBack}>
                            {next ? `Volver a la ruta y seguir a la estación ${next.station}` : "Volver a la ruta"}
                          </button>
                        )}
                        {!next && mode === "preview" && (
                          <button type="button" className={styles.button} onClick={onRestart}>
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
            ) : phase === "final" || phase === "resumen" || phase === "completo" ? (
              <span
                className={styles.px}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, padding: "6px 4px" }}
              >
                <PixelIcon name="check" size={14} /> Así sí se hace: mira a {experience.character} paso a paso.
              </span>
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
                <div className={`${styles.moments} ${coachSpot === "moments" ? styles.spot : ""}`} role="group" aria-label="Momentos de la escena">
                  {map.moments.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.moment} ${moment === m.id ? styles.momentOn : ""} ${nudge === m.id ? styles.momentNudge : ""}`}
                      aria-pressed={moment === m.id}
                      aria-label={`Momento ${m.id}: ${m.label}, ${momentStats[i].found} de ${momentStats[i].total} encontrados`}
                      onClick={() => goMoment(m.id)}
                      disabled={phase !== "juego"}
                      title={m.hint}
                    >
                      <span className={styles.momentNum}>{m.id}</span>
                      {m.label}
                      <span className={`${styles.momentCount} ${momentStats[i].found >= momentStats[i].total ? styles.momentDone : ""}`} aria-hidden>
                        {momentStats[i].found >= momentStats[i].total ? <PixelIcon name="check" size={12} /> : `${momentStats[i].found}/${momentStats[i].total}`}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${styles.iconButton} ${coachSpot === "help" ? styles.spot : ""}`}
                  onClick={hint}
                  disabled={phase !== "juego" || windowOpen}
                >
                  <PixelIcon name="pista" size={16} /> Pista
                </button>
                <button
                  type="button"
                  className={`${styles.iconButton} ${coachSpot === "help" ? styles.spot : ""}`}
                  onClick={openZones}
                  disabled={phase !== "juego" || windowOpen}
                >
                  <PixelIcon name="zonas" size={16} /> Zonas
                </button>
                <span className={styles.toolbarHint}>
                  {momentInfo.hint}{" "}
                  {here.total - here.found > 0 ? `Faltan ${here.total - here.found} por encontrar aquí.` : "Aquí ya encontraste todo."}
                </span>
              </>
            )}
          </nav>
        </div>

        <aside className={styles.quest}>
          <section ref={questRef} className={`${styles.window} ${coachSpot === "quest" ? styles.spot : ""}`} aria-labelledby="xp-quest-title">
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
                {experience.risks.map((r, k) => {
                  const res = results.get(r.id);
                  if (!res) {
                    const open = clueRisk === r.id;
                    const m = map.moments.find((x) => x.id === momentWith(r.id))!;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          className={`${styles.questItem} ${styles.questLocked} ${open ? styles.questOpen : ""}`}
                          onClick={() => openClue(r.id)}
                          aria-expanded={open}
                        >
                          <span className={styles.questBadge} style={{ background: "#fff3c4", borderColor: "#d9b13a" }}>
                            <PixelIcon name="pista" size={16} />
                          </span>
                          <span className={styles.questText}>
                            Riesgo {k + 1}
                            <span className={styles.questCat}>{open ? "Toca para cerrar" : "Por encontrar · toca para ver una pista"}</span>
                          </span>
                        </button>
                        {open && (
                          <p className={styles.questClue} role="status">
                            <b>Pista:</b> {r.clue}
                            {m.id !== moment && (
                              <>
                                {" "}
                                Está en el momento {m.id}: {m.label}.
                              </>
                            )}
                          </p>
                        )}
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
                            {res.category} ·{" "}
                            {res.chosen === null ? "no lo encontraste" : res.correct ? "a la primera" : "con ayuda"}
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
    </>
  );
}

/**
 * Tonos de la marca para las ventanas y el botón principal (variables de player.module.css).
 * Se parte del acento, que siempre lleva texto blanco legible: las cabeceras de ventana lo necesitan.
 */
function brandSkin(brand: PublicBrand): React.CSSProperties {
  const p = brandPalette(brand);
  return {
    "--head-a": p.accent,
    "--head-b": mix(p.accent, INK, 0.35),
    "--cyan": mix(p.accent, "#FFFFFF", 0.25),
  } as React.CSSProperties;
}
