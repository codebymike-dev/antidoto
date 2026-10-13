"use client";

// Constructor de Bricks Serious Play (fase 3 de docs/plan-construccion-3d.md). La interfaz sigue
// la investigación (sección 3): celular en vertical con los controles al alcance del pulgar,
// escritorio con la bandeja a un lado, cada gesto con un botón equivalente visible y deshacer
// siempre a mano.

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PublicBuild } from "@/lib/bricks/challenges";
import { BRICK_COLORS, type BrickFamily } from "@/lib/bricks/palette";
import { part, partByKey } from "@/lib/bricks/parts";
import type { Brick } from "@/lib/bricks/world";
import type { Tier } from "../material";
import { brickSound } from "../sound";
import ChallengeLayer, { type ChallengeSession } from "./ChallengeLayer";
import TeamLayer from "../team/TeamLayer";
import type { PlayerView } from "@/lib/brick-session";
import { BuilderEngine } from "./engine";
import { Icon } from "./icons";
import LeaveConfirm from "@/components/LeaveConfirm";
import styles from "./builder.module.css";

const CATEGORIES: { name: string; parts: string[] }[] = [
  { name: "Ladrillos", parts: ["ladrillo-1x1", "ladrillo-1x2", "ladrillo-1x4", "ladrillo-2x2", "ladrillo-2x4", "ladrillo-2x6"] },
  { name: "Placas", parts: ["placa-1x2", "placa-2x2", "placa-2x4", "placa-4x4"] },
  { name: "Tejas", parts: ["teja-1x1", "teja-1x2", "teja-2x2", "teja-1x4"] },
  { name: "Inclinadas", parts: ["inclinada-1x2", "inclinada-2x2", "inclinada-4x2", "inclinada-2x3"] },
  { name: "Redondas", parts: ["ladrillo-redondo-1x1", "placa-redonda-1x1", "ladrillo-redondo-2x2", "cilindro-2x2"] },
  { name: "Ventanas", parts: ["ventana-1x2x3", "ventana-1x4x3", "puerta-1x4x6"] },
];
const TRAY_IDS = CATEGORIES.flatMap((c) => c.parts.map((k) => partByKey(k).id));
const FAMILIES: BrickFamily[] = ["Neutros", "Azules", "Cálidos", "Rosas", "Verdes", "Tierras", "Especiales"];
const FREE_BASE = 24;
const GUIDE_KEY = "antidoto-ladrillos-guia";

/** Nivel inicial por heurística; el banco de pruebas medirá si hace falta afinarlo. */
function chooseTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if (cores <= 4 || memory <= 3) return "bajo";
  const touch = matchMedia("(pointer: coarse)").matches;
  return touch ? "medio" : "alto";
}

/** Nombre corto para la bandeja: la pestaña ya dice qué familia es. */
function shortName(name: string): string {
  if (/ redond[oa] /.test(name)) return name.replace(/ redond[oa]/, "");
  return name.replace(/^(Ladrillo|Placa|Teja|Inclinada|Ventana) /, "");
}

function starter(base: number): Brick[] {
  // La base no arranca vacía: una pieza puesta invita a poner la siguiente encima.
  return [{ id: "inicio", part: partByKey("ladrillo-2x4").id, color: BRICK_COLORS.findIndex((c) => c.name === "Rojo brillante"), x: base / 2 - 2, y: 0, z: base / 2 - 1, rot: 0 }];
}

export interface BuilderProps {
  title: string;
  /** A dónde lleva la flecha de salir (admin). */
  exitHref?: string;
  /** Salir como participante: borra la sesión del dispositivo, previa confirmación. */
  exitAction?: () => Promise<void>;
  /** Qué pasa al salir, en la confirmación. */
  exitNote?: string;
  /** Reto de la biblioteca; sin reto es construcción libre de prueba. */
  challenge?: PublicBuild;
  session?: ChallengeSession;
  /** Obra guardada para retomarla. */
  initial?: Brick[];
  /** Construcción en equipo en vivo: la obra es compartida y la manda el servidor. */
  team?: PlayerView;
}

function initialBricks({ challenge, initial, team }: BuilderProps): Brick[] {
  if (team) return team.team.bricks;
  if (initial?.length) return initial;
  if (!challenge) return starter(FREE_BASE);
  return challenge.starter ? starter(challenge.base) : [];
}

export default function Builder(props: BuilderProps) {
  const { title, exitHref, exitAction, challenge, session, team } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine] = useState(() => new BuilderEngine(team?.session.base ?? challenge?.base ?? FREE_BASE, initialBricks(props)));
  const [introOpen, setIntroOpen] = useState(() => !!challenge && !session?.started);
  const [teamStatus, setTeamStatus] = useState(() => team?.session.status ?? null);
  // En equipo, la guía y las pistas esperan a que el anfitrión dé la señal.
  const waiting = introOpen || (teamStatus !== null && teamStatus !== "building");
  const limit = team ? team.session.maxPieces : (challenge?.maxPieces ?? null);
  const [tier] = useState<Tier>(chooseTier);
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  const sound = brickSound();
  const muted = useSyncExternalStore(sound.subscribe, sound.getMuted, () => false);
  const [category, setCategory] = useState(0);
  const [allColors, setAllColors] = useState(false);
  const [help, setHelp] = useState(false);
  const [guideDone, setGuideDone] = useState(() => localStorage.getItem(GUIDE_KEY) === "listo");
  const [undoTipOver, setUndoTipOver] = useState(false);
  /** Cuántas piezas se habían puesto cuando venció el plazo de inactividad. */
  const [idleAt, setIdleAt] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    engine.mount(canvas, tier);
    engine.setTrayParts(TRAY_IDS);
    engine.setLimit(limit);
    const parent = canvas.parentElement!;
    const ro = new ResizeObserver(() => engine.resize(parent.clientWidth, parent.clientHeight));
    ro.observe(parent);
    engine.resize(parent.clientWidth, parent.clientHeight);
    return () => {
      ro.disconnect();
      engine.unmount();
    };
  }, [engine, tier, limit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      // Con una ventana del reto abierta, el teclado es de la ventana.
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      if (e.key === "?") {
        setHelp((h) => !h);
        return;
      }
      if (engine.handleKey(e)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  // Primer minuto guiado (investigación, 3.7): colocar, girar la cámara, deshacer. Se aprende
  // haciendo; cada paso se cumple con la acción misma.
  const step = guideDone || waiting ? null : snap.placed === 0 ? 0 : snap.orbits === 0 ? 1 : snap.undos === 0 && !undoTipOver ? 2 : null;
  useEffect(() => {
    if (step !== 2) return;
    const id = setTimeout(() => setUndoTipOver(true), 7000);
    return () => clearTimeout(id);
  }, [step]);
  useEffect(() => {
    if (!guideDone && step === null) localStorage.setItem(GUIDE_KEY, "listo");
  }, [guideDone, step]);

  // Pista por inactividad: 20 s sin poner nada, con pocas piezas, una sugerencia suave.
  useEffect(() => {
    const placed = snap.placed;
    const id = setTimeout(() => setIdleAt(placed), 20000);
    return () => clearTimeout(id);
  }, [snap.placed]);
  const idleHint = step === null && !waiting && !team && idleAt === snap.placed && snap.count < 5 && !challenge?.model;

  const takePhoto = () => {
    const url = engine.photo();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `bricks-serious-play-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const color = snap.color;
  const sel = snap.selection;
  const handPart = snap.hand?.part ?? null;
  const essentials = BRICK_COLORS.map((c, i) => ({ ...c, i })).filter((c) => c.essential);

  return (
    <div className={styles.root}>
      <header className={styles.top} data-builder-ui>
        {exitAction ? (
          <LeaveConfirm
            action={exitAction}
            className={styles.iconBtn}
            title="¿Salir de la actividad?"
            body={<p style={{ margin: 0 }}>{props.exitNote ?? "Lo que llevas construido queda guardado. Este dispositivo olvidará tu sesión: para volver, entra con tu mismo nombre y código."}</p>}
            confirmLabel="Salir"
          >
            <Icon name="back" />
            <span className={styles.srOnly}>Salir</span>
          </LeaveConfirm>
        ) : (
          <Link href={exitHref ?? "/admin/biblioteca"} className={styles.iconBtn} aria-label="Salir">
            <Icon name="back" />
          </Link>
        )}
        <div className={styles.titleBox}>
          <p className={styles.brand}>Bricks Serious Play</p>
          <h1 className={styles.title}>{title}</h1>
        </div>
        {snap.limit !== null ? (
          <span className={`${styles.count} ${styles.countBudget} ${snap.count >= snap.limit ? styles.countFull : ""}`} aria-label={`${snap.count} de ${snap.limit} piezas`}>
            {snap.count}/{snap.limit} piezas
          </span>
        ) : (
          <span className={styles.count} aria-label={`${snap.count} piezas`}>
            {snap.count} {snap.count === 1 ? "pieza" : "piezas"}
          </span>
        )}
        {!challenge && !team && (
          <button type="button" className={styles.iconBtn} aria-label="Descargar foto de la obra" onClick={takePhoto}>
            <Icon name="camera" />
          </button>
        )}
        <button type="button" className={styles.iconBtn} aria-label="Ayuda y controles" onClick={() => setHelp(true)}>
          <Icon name="help" />
        </button>
        <button type="button" className={styles.iconBtn} aria-label={muted ? "Activar sonido" : "Silenciar"} aria-pressed={muted} onClick={() => sound.setMuted(!muted)}>
          <Icon name={muted ? "mute" : "sound"} />
        </button>
      </header>

      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <button type="button" className={`${styles.iconBtn} ${styles.frame}`} aria-label="Centrar la vista" onClick={() => engine.frameAll()} data-builder-ui>
          <Icon name="target" />
        </button>

        {challenge && session && (
          <ChallengeLayer engine={engine} snap={snap} challenge={challenge} session={session} introOpen={introOpen} onIntroClose={() => setIntroOpen(false)} />
        )}

        {team && <TeamLayer engine={engine} snap={snap} view={team} onStatus={setTeamStatus} />}

        {step !== null && (
          <div className={`${styles.coach} ${challenge || team ? styles.coachLow : ""}`} role="status">
            <span className={styles.coachStep}>{step + 1}/3</span>
            {step === 0 && "Arrastra una pieza de la bandeja hasta la base"}
            {step === 1 && "Arrastra en un espacio vacío para girar la vista"}
            {step === 2 && (
              <>
                ¿Te equivocaste? Toca <Icon name="undo" size={16} /> para deshacer
              </>
            )}
            <button type="button" className={styles.coachSkip} onClick={() => setGuideDone(true)} data-builder-ui>
              Saltar
            </button>
            {step === 0 && <span className={styles.hand} aria-hidden="true" />}
          </div>
        )}

        {idleHint && (
          <div className={`${styles.coach} ${challenge ? styles.coachLow : ""}`} role="status">
            {snap.count <= 1 ? "Prueba poner una pieza encima de la azul" : "Prueba girar una pieza con ↻ antes de ponerla"}
          </div>
        )}

        <div className={styles.badges} aria-hidden="true">
          {snap.ghost && !snap.ghost.ok && <span className={styles.badge}>⊘ {snap.ghost.problem === "ocupado" ? "Ahí ya hay una pieza" : snap.ghost.problem === "parcela" ? "Fuera de tu franja" : "Necesita apoyarse en algo"}</span>}
          {snap.floating > 0 && (
            <span className={styles.badge}>
              <i className={styles.dot} /> {snap.floating} {snap.floating === 1 ? "pieza suelta" : "piezas sueltas"}
            </span>
          )}
        </div>

        {snap.notice && (
          <div key={snap.notice.id} className={`${styles.toast} ${snap.notice.undo ? styles.toastLong : ""}`} data-builder-ui>
            <span>{snap.notice.text}</span>
            {snap.notice.undo && (
              <button type="button" onClick={() => engine.undo()}>
                Deshacer
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions} data-builder-ui>
        {sel && !snap.hand ? (
          <>
            <button type="button" className={styles.action} onClick={() => engine.rotate()}>
              <Icon name="rotate" />
              <span>Girar</span>
            </button>
            <button type="button" className={styles.action} onClick={() => engine.setColor(color)} disabled={sel.color === color}>
              <Icon name="paint" />
              <span>Pintar</span>
            </button>
            <button type="button" className={styles.action} onClick={() => engine.moveSelection()}>
              <Icon name="move" />
              <span>Mover</span>
            </button>
            <button type="button" className={styles.action} onClick={() => engine.duplicateSelection()}>
              <Icon name="copy" />
              <span>Duplicar</span>
            </button>
            <button type="button" className={styles.action} onClick={() => engine.deleteSelection()}>
              <Icon name="trash" />
              <span>Eliminar</span>
            </button>
            <button type="button" className={styles.action} onClick={() => engine.cancel()} aria-label="Quitar selección">
              <Icon name="close" />
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.action} onClick={() => engine.undo()} disabled={!snap.canUndo} aria-label="Deshacer">
              <Icon name="undo" />
            </button>
            <button type="button" className={styles.action} onClick={() => engine.rotate()} disabled={!snap.hand} aria-label="Girar la pieza">
              <Icon name="rotate" />
            </button>
            <button type="button" className={styles.place} onClick={() => engine.place()} disabled={!snap.hand} aria-disabled={!snap.ghost?.ok || !!snap.readOnly}>
              {snap.moving ? "Soltar aquí" : "Colocar"}
            </button>
            <button type="button" className={styles.action} onClick={() => engine.redo()} disabled={!snap.canRedo} aria-label="Rehacer">
              <Icon name="redo" />
            </button>
            <button type="button" className={styles.action} onClick={() => engine.clearHand()} disabled={!snap.hand} aria-label="Soltar la pieza en mano">
              <Icon name="close" />
            </button>
          </>
        )}
      </div>

      <aside className={styles.tray} data-builder-ui aria-label="Piezas y colores">
        <div className={styles.tabs} role="tablist">
          {CATEGORIES.map((c, i) => (
            <button key={c.name} type="button" role="tab" aria-selected={category === i} onClick={() => setCategory(i)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className={styles.parts}>
          {CATEGORIES[category].parts.map((k) => {
            const p = partByKey(k);
            const thumb = snap.thumbs.get(p.id);
            return (
              <button
                key={k}
                type="button"
                className={styles.part}
                aria-pressed={handPart === p.id}
                aria-label={p.name}
                onPointerDown={(e) => {
                  if (e.pointerType === "mouse" && e.button !== 0) return;
                  engine.beginTrayDrag(p.id, color, e.nativeEvent);
                }}
                onClick={(e) => {
                  // Teclado (Enter o Espacio): sin puntero, solo se toma la pieza.
                  if (e.detail === 0) engine.setHand(p.id, color);
                }}
              >
                {/* Data URL dibujada en el navegador: next/image no aporta nada aquí. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {thumb ? <img src={thumb} alt="" draggable={false} /> : <span className={styles.partSkeleton} />}
                <span className={styles.partName}>{shortName(p.name)}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.colors}>
          {(allColors ? FAMILIES : [null]).map((family) => (
            <div key={family ?? "esenciales"} className={styles.colorRow}>
              {family && <p className={styles.family}>{family}</p>}
              <div className={styles.swatches}>
                {(family ? BRICK_COLORS.map((c, i) => ({ ...c, i })).filter((c) => c.family === family) : essentials).map((c) => (
                  <button
                    key={c.i}
                    type="button"
                    className={`${styles.swatch} ${c.finish === "trans" ? styles.trans : ""} ${c.finish === "metal" ? styles.metal : ""}`}
                    style={{ "--c": c.hex } as React.CSSProperties}
                    aria-label={`${c.name}, familia ${c.family}`}
                    aria-pressed={color === c.i}
                    title={c.name}
                    onClick={() => engine.setColor(c.i)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className={styles.colorFoot}>
            <span className={styles.colorName}>{BRICK_COLORS[color].name}</span>
            <button type="button" className={styles.more} onClick={() => setAllColors((a) => !a)} aria-expanded={allColors}>
              {allColors ? "Menos colores" : "Todos los colores"}
            </button>
          </div>
        </div>
      </aside>

      <p className={styles.srOnly} aria-live="polite">
        {snap.announce}
      </p>

      {help && <HelpSheet onClose={() => setHelp(false)} handName={snap.hand ? part(snap.hand.part).name : null} brief={team ? { title: team.title, prompt: team.prompt } : challenge ? { title: challenge.texts.title, prompt: challenge.texts.prompt } : null} />}
    </div>
  );
}

function HelpSheet({ onClose, handName, brief }: { onClose: () => void; handName: string | null; brief: { title: string; prompt: string } | null }) {
  return (
    <div className={styles.helpBackdrop} onClick={onClose} data-builder-ui>
      <div className={styles.help} role="dialog" aria-modal="true" aria-label="Controles" onClick={(e) => e.stopPropagation()}>
        <div className={styles.helpHead}>
          <h2>Cómo construir</h2>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Cerrar" autoFocus>
            <Icon name="close" />
          </button>
        </div>
        {brief && (
          <>
            <h3>El reto: {brief.title}</h3>
            <p className={styles.helpPrompt}>{brief.prompt}</p>
          </>
        )}
        {handName && <p className={styles.helpHand}>En la mano: {handName}</p>}
        <h3>En el celular</h3>
        <dl>
          <dt>Arrastrar una pieza de la bandeja</dt>
          <dd>La pone donde sueltas el dedo</dd>
          <dt>Tocar la base con una pieza en la mano</dt>
          <dd>Mueve la pieza translúcida; toca &quot;Colocar&quot; o tócala para ponerla</dd>
          <dt>Arrastrar en un espacio vacío</dt>
          <dd>Gira la vista</dd>
          <dt>Pellizcar / dos dedos</dt>
          <dd>Acerca, aleja y desplaza</dd>
          <dt>Tocar una pieza puesta</dt>
          <dd>La selecciona: girar, pintar, mover, duplicar o eliminar</dd>
          <dt>Mantener una pieza puesta</dt>
          <dd>La levanta para moverla</dd>
        </dl>
        <h3>En el computador</h3>
        <dl>
          <dt>Clic</dt>
          <dd>Coloca la pieza en mano (sigue en la mano para repetir)</dd>
          <dt>Arrastrar · clic derecho arrastrando</dt>
          <dd>Gira la vista; Shift + arrastrar la desplaza; la rueda acerca</dd>
          <dt>R · Shift + R</dt>
          <dd>Gira la pieza</dd>
          <dt>Flechas · Enter</dt>
          <dd>Mueven la pieza en mano de a un stud · la colocan</dd>
          <dt>Ctrl + Z · Ctrl + Shift + Z</dt>
          <dd>Deshacer · rehacer</dd>
          <dt>Supr · Ctrl + D · Esc</dt>
          <dd>Eliminar · duplicar · soltar la pieza</dd>
          <dt>F</dt>
          <dd>Centrar la vista</dd>
        </dl>
      </div>
    </div>
  );
}
