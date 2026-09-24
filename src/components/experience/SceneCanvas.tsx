"use client";

import { useEffect, useRef } from "react";
import { PixelBuffer } from "./pixel/buffer";
import { FincaScene } from "./scenes/finca";

// Lienzo de la escena: corre el bucle de animación a ~30 cuadros por segundo (el ritmo de
// Habbo, y ahorra batería) y traduce los toques a píxeles del lienzo interno de 400x250.
// Llena el ancho disponible sin pasar del alto; el escalado es sin suavizado desde 1,5x.

const FRAME = 1 / 30;

interface Props {
  onScene: (scene: FincaScene) => void;
  onSay: (text: string) => void;
  onTap: (x: number, y: number, touch: boolean) => void;
  /** Alto máximo disponible en px (para que la escena quepa sin scroll en escritorio). */
  maxHeight: number;
  label: string;
  /** Capas HTML encima del lienzo (burbujas, ventanas); se posicionan en % del lienzo. */
  children?: React.ReactNode;
}

export default function SceneCanvas({ onScene, onSay, onTap, maxHeight, label, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sayRef = useRef(onSay);
  const sceneRef = useRef<FincaScene | null>(null);

  useEffect(() => {
    sayRef.current = onSay;
  }, [onSay]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = new FincaScene({ say: (t) => sayRef.current(t) });
    sceneRef.current = scene;
    onScene(scene);

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
    const canvas = canvasRef.current!;
    const fit = () => {
      const k = Math.min(wrap.clientWidth / 400, maxHeight / 250);
      box.style.width = `${Math.round(400 * k)}px`;
      box.style.height = `${Math.round(250 * k)}px`;
      // Por debajo de 1,5x el escalado sin suavizado se come líneas de 1 px.
      canvas.style.imageRendering = k < 1.5 ? "auto" : "pixelated";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [maxHeight]);

  return (
    <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div ref={boxRef} style={{ position: "relative", width: "100%", aspectRatio: "400 / 250", maxWidth: "100%" }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={250}
          role="img"
          aria-label={label}
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 400;
            const y = ((e.clientY - rect.top) / rect.height) * 250;
            onTap(x, y, e.pointerType === "touch");
          }}
          style={{ display: "block", width: "100%", height: "100%", cursor: "zoom-in", touchAction: "manipulation" }}
        />
        {children}
      </div>
    </div>
  );
}
