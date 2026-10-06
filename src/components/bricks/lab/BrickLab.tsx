"use client";

// Banco de pruebas de render (fase 1 de docs/plan-construccion-3d.md). Mide si el look de
// plástico aguanta en un celular de gama media antes de construir el juego encima.
// Criterio de paso: 1.500 ladrillos a 50 FPS o más orbitando en nivel medio, 40 draw calls o
// menos y primera imagen en menos de 3 s en 4G.

import { useEffect, useRef, useState } from "react";
import type { Tier } from "../material";
import { LabEngine, TIERS, type LabStats } from "./engine";
import styles from "./lab.module.css";

const COUNTS = [500, 1500, 3000] as const;

interface Snapshot {
  fps: number | null;
  worstMs: number | null;
  calls: number;
  triangles: number;
  studs: number;
  firstFrame: number | null;
  buildMs: number;
  gpu: string;
  dpr: number;
}

function snapshot(s: LabStats): Snapshot {
  const f = s.frames;
  const live = f.length > 1 && performance.now() - f[f.length - 1] < 500;
  let worst = 0;
  for (let i = 1; i < f.length; i++) worst = Math.max(worst, f[i] - f[i - 1]);
  return {
    fps: live ? ((f.length - 1) * 1000) / (f[f.length - 1] - f[0]) : null,
    worstMs: live ? worst : null,
    calls: s.calls,
    triangles: s.triangles,
    studs: s.studs,
    firstFrame: s.firstFrame,
    buildMs: s.buildMs,
    gpu: s.gpu,
    dpr: s.dpr,
  };
}

const fmt = (n: number) => n.toLocaleString("es-CO");

export default function BrickLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LabEngine | null>(null);
  const [count, setCount] = useState<number>(1500);
  const [tier, setTier] = useState<Tier>("medio");
  const [orbit, setOrbit] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [copied, setCopied] = useState(false);
  // El modelo y la órbita se leen al crear el motor sin recrearlo cuando cambian.
  const countRef = useRef(count);
  const orbitRef = useRef(orbit);

  // Un motor por nivel de calidad: cambiar de nivel recrea el contexto con su configuración.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new LabEngine(canvas, tier);
    engineRef.current = engine;
    const parent = canvas.parentElement!;
    const ro = new ResizeObserver(() => engine.resize(parent.clientWidth, parent.clientHeight));
    ro.observe(parent);
    engine.resize(parent.clientWidth, parent.clientHeight);
    engine.setModel(countRef.current, true);
    engine.setOrbit(orbitRef.current);
    const id = setInterval(() => setSnap(snapshot(engine.stats)), 500);
    return () => {
      clearInterval(id);
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [tier]);

  useEffect(() => {
    countRef.current = count;
    engineRef.current?.setModel(count, true);
  }, [count]);

  useEffect(() => {
    orbitRef.current = orbit;
    engineRef.current?.setOrbit(orbit);
  }, [orbit]);

  const report = snap
    ? [
        `Ladrillos: ${count} · Nivel: ${tier} · DPR: ${snap.dpr}`,
        `FPS (2 s): ${snap.fps ? snap.fps.toFixed(1) : "en reposo"} · Peor cuadro: ${snap.worstMs ? snap.worstMs.toFixed(0) + " ms" : "-"}`,
        `Draw calls: ${snap.calls} · Triángulos: ${fmt(snap.triangles)} · Studs dibujados: ${fmt(snap.studs)}`,
        `Primera imagen: ${snap.firstFrame ? (snap.firstFrame / 1000).toFixed(2) + " s" : "-"} · Armado del modelo: ${snap.buildMs.toFixed(0)} ms`,
        `GPU: ${snap.gpu} · WebGPU disponible: ${"gpu" in navigator ? "sí" : "no"}`,
        `Navegador: ${navigator.userAgent}`,
      ].join("\n")
    : "";

  return (
    <div className={styles.root}>
      {/* La clave fuerza un canvas nuevo por nivel: un contexto WebGL no cambia su antialias. */}
      <div className={styles.stage}>
        <canvas key={tier} ref={canvasRef} className={styles.canvas} />
      </div>

      <aside className={styles.panel}>
        <p className={styles.title}>Banco de pruebas · ladrillos</p>
        <div className={styles.row}>
          {COUNTS.map((c) => (
            <button key={c} type="button" aria-pressed={count === c} onClick={() => setCount(c)}>
              {fmt(c)}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          {(Object.keys(TIERS) as Tier[]).map((t) => (
            <button key={t} type="button" aria-pressed={tier === t} onClick={() => setTier(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          <button type="button" aria-pressed={orbit} onClick={() => setOrbit((o) => !o)}>
            {orbit ? "Detener órbita" : "Orbitar (medir FPS)"}
          </button>
        </div>
        {snap && (
          <details className={styles.details} open>
            <summary>Métricas</summary>
            <dl className={styles.stats}>
              <dt>FPS</dt>
              <dd className={snap.fps !== null && snap.fps < 50 ? styles.bad : undefined}>{snap.fps !== null ? snap.fps.toFixed(0) : "en reposo"}</dd>
              <dt>Peor cuadro</dt>
              <dd>{snap.worstMs !== null ? `${snap.worstMs.toFixed(0)} ms` : "-"}</dd>
              <dt>Draw calls</dt>
              <dd className={snap.calls > 40 ? styles.bad : undefined}>{snap.calls}</dd>
              <dt>Triángulos</dt>
              <dd>{fmt(snap.triangles)}</dd>
              <dt>Studs</dt>
              <dd>{fmt(snap.studs)}</dd>
              <dt>Primera imagen</dt>
              <dd>{snap.firstFrame ? `${(snap.firstFrame / 1000).toFixed(2)} s` : "-"}</dd>
              <dt>DPR</dt>
              <dd>{snap.dpr}</dd>
              <dt>GPU</dt>
              <dd className={styles.gpu}>{snap.gpu || "-"}</dd>
            </dl>
          </details>
        )}
        <button
          type="button"
          className={styles.copy}
          disabled={!report}
          onClick={() => {
            navigator.clipboard?.writeText(report).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copiado" : "Copiar reporte"}
        </button>
      </aside>
    </div>
  );
}
