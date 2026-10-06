"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import { PixelBuffer } from "./pixel/buffer";
import { createScene, type SceneKey } from "./scenes";
import type { PlayScene } from "./scenes/types";

// Lienzo de la escena: corre el bucle de animación a ~30 cuadros por segundo (el ritmo de
// Habbo, y ahorra batería) y traduce los toques a píxeles del lienzo interno de 400x250.
// Llena el ancho disponible sin pasar del alto; el escalado es sin suavizado desde 1,5x.
//
// Lupa: en un celular la escena se ve a ~0,9x y los detalles de 2 a 4 px se pierden. Con
// dos dedos (o los botones de la lupa) se acerca hasta 3x y con un dedo se mueve la vista.
// La vista viaja en tres variables CSS del contenedor (--vz, --vx, --vy) para que las capas
// HTML ancladas a la escena (anillo, burbujas) la sigan sin volver a renderizar React.

const FRAME = 1 / 30;
const W = 400;
const H = 250;
export const MAX_ZOOM = 3;
/** Cuánto puede moverse el dedo (px de pantalla) y que siga contando como toque, no como arrastre. */
const TAP_SLOP = 10;

/** Vista de la escena: acercamiento y esquina superior izquierda visible, en px de la escena. */
interface View {
  z: number;
  x: number;
  y: number;
}

export interface SceneHandle {
  /** Acerca o aleja centrando la vista en (x, y) de la escena; sin punto, mantiene el centro actual. */
  zoomTo(z: number, x?: number, y?: number): void;
  /** Con la lupa puesta, centra la vista en ese punto de la escena; sin lupa no hace nada. */
  focus(x: number, y: number): void;
  /** El lienzo de la escena, para copiar recortes (la viñeta de la pregunta). */
  canvas(): HTMLCanvasElement | null;
}

interface Props {
  /** Qué escena dibujar; se crea una sola vez por montaje. */
  sceneKey: SceneKey;
  onScene: (scene: PlayScene) => void;
  onSay: (text: string) => void;
  /** `scale`: píxeles de pantalla por píxel de la escena (en un celular ronda 0,9; con la lupa, más). */
  onTap: (x: number, y: number, touch: boolean, scale: number) => void;
  /** Alto máximo disponible en px (para que la escena quepa sin scroll en escritorio). */
  maxHeight: number;
  label: string;
  /** Si se puede usar la lupa; al quitarla, la vista vuelve a la escena completa. */
  zoomable: boolean;
  /** Avisa el acercamiento actual (1 = escena completa). */
  onZoom?: (z: number) => void;
  ref?: React.Ref<SceneHandle>;
  /** Capas HTML encima del lienzo (burbujas, ventanas); se posicionan en % del lienzo. */
  children?: React.ReactNode;
}

export default function SceneCanvas({ sceneKey, onScene, onSay, onTap, maxHeight, label, zoomable, onZoom, ref, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sayRef = useRef(onSay);
  const sceneRef = useRef<PlayScene | null>(null);
  const view = useRef<View>({ z: 1, x: 0, y: 0 });
  const zoomRef = useRef(onZoom);
  const zoomableRef = useRef(zoomable);
  // Dedos (o mouse) apoyados y el gesto en curso.
  const points = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ sx: number; sy: number; v: View; tap: boolean; dist?: number; anchor?: { x: number; y: number } } | null>(null);

  useEffect(() => {
    sayRef.current = onSay;
    zoomRef.current = onZoom;
  }, [onSay, onZoom]);

  /** Aplica una vista: la acota a la escena y la pasa al contenedor y al lienzo. */
  function apply(next: View) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next.z));
    const v = {
      z,
      x: Math.min(W - W / z, Math.max(0, next.x)),
      y: Math.min(H - H / z, Math.max(0, next.y)),
    };
    const changed = v.z !== view.current.z;
    view.current = v;
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    box.style.setProperty("--vz", String(v.z));
    box.style.setProperty("--vx", String(v.x / W));
    box.style.setProperty("--vy", String(v.y / H));
    // Por debajo de 1,5x el escalado sin suavizado se come líneas de 1 px.
    canvas.style.imageRendering = (box.clientWidth / W) * v.z < 1.5 ? "auto" : "pixelated";
    // Con la lupa puesta un dedo mueve la vista; sin ella, deja hacer scroll a la página.
    canvas.style.touchAction = v.z > 1 ? "none" : "pan-y";
    // Tocar marca un riesgo, no acerca: la mano de enlace, no la lupa.
    canvas.style.cursor = v.z > 1 ? "grab" : "pointer";
    if (changed) zoomRef.current?.(v.z);
  }

  /** Punto de la escena bajo un punto de la pantalla. */
  function sceneAt(clientX: number, clientY: number) {
    const rect = boxRef.current!.getBoundingClientRect();
    const v = view.current;
    return {
      x: v.x + ((clientX - rect.left) / rect.width) * (W / v.z),
      y: v.y + ((clientY - rect.top) / rect.height) * (H / v.z),
    };
  }

  function zoomTo(z: number, x?: number, y?: number) {
    const v = view.current;
    const cx = x ?? v.x + W / v.z / 2;
    const cy = y ?? v.y + H / v.z / 2;
    const nz = Math.min(MAX_ZOOM, Math.max(1, z));
    apply({ z: nz, x: cx - W / nz / 2, y: cy - H / nz / 2 });
  }

  useImperativeHandle(ref, () => ({
    zoomTo,
    focus: (x, y) => {
      if (view.current.z > 1) zoomTo(view.current.z, x, y);
    },
    canvas: () => canvasRef.current,
  }));

  // Sin lupa (historia, final), la escena se ve completa.
  useEffect(() => {
    zoomableRef.current = zoomable;
    if (!zoomable) apply({ z: 1, x: 0, y: 0 });
  }, [zoomable]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = createScene(sceneKey, { say: (t) => sayRef.current(t) });
    sceneRef.current = scene;
    onScene(scene);
    (window as unknown as { __scene?: PlayScene }).__scene = scene; // TEMP-MOVIL

    const buf = new PixelBuffer(scene.width, scene.height);
    const ctx = canvas.getContext("2d")!;
    const image = new ImageData(new Uint8ClampedArray(buf.data.buffer as ArrayBuffer), scene.width, scene.height);
    let raf = 0;
    let last = performance.now();
    let acc = FRAME;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      if (acc >= FRAME) {
        scene.update(acc);
        acc = 0;
        scene.render(buf);
        ctx.putImageData(image, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // La escena se crea una sola vez por montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tamaño: todo el ancho disponible, sin pasar del alto. Se probó ajustar a múltiplos
  // enteros, pero dejaba franjas negras a los lados: con escala fraccionaria algunos
  // píxeles miden uno más que otros y no se nota.
  useEffect(() => {
    const wrap = wrapRef.current!;
    const box = boxRef.current!;
    const fit = () => {
      const k = Math.min(wrap.clientWidth / W, maxHeight / H);
      box.style.width = `${Math.round(W * k)}px`;
      box.style.height = `${Math.round(H * k)}px`;
      apply(view.current);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [maxHeight]);

  // Pellizco del trackpad en el computador (llega como rueda con Ctrl) y, en iOS, que el
  // pellizco no agrande la página entera en vez de la escena.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const box = boxRef.current!;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || !zoomableRef.current) return;
      e.preventDefault();
      const at = sceneAt(e.clientX, e.clientY);
      const rect = box.getBoundingClientRect();
      const z = Math.min(MAX_ZOOM, Math.max(1, view.current.z * Math.exp(-e.deltaY * 0.01)));
      apply({ z, x: at.x - ((e.clientX - rect.left) / rect.width) * (W / z), y: at.y - ((e.clientY - rect.top) / rect.height) * (H / z) });
    };
    const block = (e: Event) => e.preventDefault();
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("gesturestart", block);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("gesturestart", block);
    };
  }, []);

  /** Empieza un gesto de un dedo desde donde está (al apoyar, o al soltar uno de dos). */
  function restart(p: { x: number; y: number }, tap: boolean) {
    gesture.current = { sx: p.x, sy: p.y, v: { ...view.current }, tap };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...points.current.values()];
    if (pts.length === 1) return restart(pts[0], true);
    // Dos dedos: pellizco anclado al punto de la escena que queda entre ellos.
    const g = gesture.current;
    if (!g) return;
    g.tap = false;
    if (pts.length === 2 && zoomableRef.current) {
      const [a, b] = pts;
      g.v = { ...view.current };
      g.dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      g.anchor = sceneAt((a.x + b.x) / 2, (a.y + b.y) / 2);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!points.current.has(e.pointerId)) return;
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const pts = [...points.current.values()];
    const rect = boxRef.current!.getBoundingClientRect();
    if (pts.length >= 2) {
      if (!g.dist || !g.anchor) return;
      const [a, b] = pts;
      const z = Math.min(MAX_ZOOM, Math.max(1, (g.v.z * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist));
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      apply({ z, x: g.anchor.x - ((mx - rect.left) / rect.width) * (W / z), y: g.anchor.y - ((my - rect.top) / rect.height) * (H / z) });
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (Math.hypot(dx, dy) > TAP_SLOP) g.tap = false;
    if (!g.tap && g.v.z > 1) {
      apply({ z: g.v.z, x: g.v.x - (dx / rect.width) * (W / g.v.z), y: g.v.y - (dy / rect.height) * (H / g.v.z) });
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!points.current.has(e.pointerId)) return;
    const g = gesture.current;
    const tap = !!g?.tap && points.current.size === 1;
    points.current.delete(e.pointerId);
    const left = [...points.current.values()];
    if (left.length === 0) gesture.current = null;
    // Al soltar un dedo del pellizco, el que queda sigue moviendo la vista sin saltos.
    else restart(left[0], false);
    if (!tap) return;
    // El toque cuenta al soltar: así un arrastre o un pellizco no marcan nada en la escena.
    const at = sceneAt(e.clientX, e.clientY);
    const rect = boxRef.current!.getBoundingClientRect();
    onTap(at.x, at.y, e.pointerType === "touch", (rect.width / W) * view.current.z);
  }

  function onPointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
    points.current.delete(e.pointerId);
    const left = [...points.current.values()];
    if (left.length === 0) gesture.current = null;
    else restart(left[0], false);
  }

  return (
    <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div ref={boxRef} style={{ position: "relative", width: "100%", aspectRatio: "400 / 250", maxWidth: "100%" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            role="img"
            aria-label={label}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              position: "absolute",
              display: "block",
              width: "calc(var(--vz, 1) * 100%)",
              height: "calc(var(--vz, 1) * 100%)",
              left: "calc(var(--vx, 0) * var(--vz, 1) * -100%)",
              top: "calc(var(--vy, 0) * var(--vz, 1) * -100%)",
              cursor: "pointer",
              touchAction: "pan-y",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            }}
          />
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Posición en % del contenedor de un punto de la escena, siguiendo la lupa. Para las capas
 * HTML ancladas a la escena: `left: sceneLeft(x)`, `top: sceneTop(y)`.
 */
export function sceneLeft(x: number): string {
  return `calc((${x / W} - var(--vx, 0)) * var(--vz, 1) * 100%)`;
}

export function sceneTop(y: number): string {
  return `calc((${y / H} - var(--vy, 0)) * var(--vz, 1) * 100%)`;
}
