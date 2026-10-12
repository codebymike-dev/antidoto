"use client";

// Lo que agrega el modo equipos al constructor (fase 6 de docs/plan-construccion-3d.md): espera en
// el lobby, reloj de la sesión, compañeros, franja propia en Obra en Equipo, altura en La Torre y
// el cierre. La conexión con el equipo vive en TeamSync, fuera de React.

import { useEffect, useState } from "react";
import type * as Ably from "ably";
import type { PlayerView } from "@/lib/brick-session";
import { heightLabel, towerHeight } from "@/lib/bricks/team";
import { brickSound } from "../sound";
import type { BuilderEngine, BuilderSnapshot } from "../builder/engine";
import { TeamSync, type TeamClock, type TeamMember } from "./team-sync";
import styles from "../builder/challenge.module.css";
import own from "./team.module.css";

interface Props {
  engine: BuilderEngine;
  snap: BuilderSnapshot;
  view: PlayerView;
  onStatus: (status: TeamClock["status"]) => void;
}

function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function TeamLayer({ engine, snap, view, onStatus }: Props) {
  const { team, session } = view;
  const identity = { name: team.name, color: team.color };
  const [clock, setClock] = useState<TeamClock>(() => ({ status: session.status, endsMs: session.endsMs, offset: session.serverNow - Date.now() }));
  const [members, setMembers] = useState<TeamMember[]>(team.members);
  const [connection, setConnection] = useState<Ably.ConnectionState>("initialized");
  const [lost, setLost] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const sync = new TeamSync(engine, { session, team, me: view.me }, {
      onClock: (c) => {
        setClock(c);
        onStatus(c.status);
      },
      onMembers: setMembers,
      onConnection: setConnection,
      onLost: setLost,
    });
    engine.connectTeam({ idPrefix: `t${view.me.tag.slice(0, 6)}`, onLocalOp: sync.local, parcel: view.parcel });
    sync.start();
    return () => sync.stop();
    // La sesión y el equipo no cambian mientras la pantalla vive: se conecta una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => {
    if (clock.status !== "building") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [clock.status]);

  const remaining = clock.endsMs === null ? null : clock.endsMs - (now + clock.offset);
  const warn = clock.status === "building" && remaining !== null && remaining > 0 && remaining <= 30000;
  useEffect(() => {
    if (warn) brickSound().play("invalid");
  }, [warn]);
  useEffect(() => {
    if (clock.status === "building") brickSound().play("pick");
    if (clock.status === "finished") brickSound().play("remove");
  }, [clock.status]);

  // La altura se lee del mundo en cada render: son pocas piezas y cambia con cada lote.
  const height = view.session.mode === "torre-equipos" ? towerHeight([...engine.world.bricks.values()], session.base) : null;
  const myPlaced = members.find((m) => m.nickname === view.me.nickname)?.placed ?? 0;
  // `snap` no se lee: su cambio (también por lotes de los compañeros) es lo que vuelve a pintar esto.
  void snap;

  if (lost) {
    return (
      <div className={styles.backdrop}>
        <div className={styles.sheet} role="alertdialog" aria-labelledby="tm-lost">
          <h2 id="tm-lost" className={styles.title}>
            Te desconectaste de la sesión
          </h2>
          <p className={styles.body}>{lost}</p>
          <a className={styles.primary} href="/construir">
            Volver a entrar
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.hud} data-builder-ui>
        <span className={own.team} style={{ "--team": identity.color } as React.CSSProperties}>
          <i aria-hidden="true" />
          {identity.name}
        </span>
        {clock.status === "building" && remaining !== null && (
          <span className={`${styles.clock} ${warn ? styles.clockWarn : ""}`} role="timer" aria-label={`Quedan ${formatClock(remaining)}`}>
            {formatClock(remaining)}
          </span>
        )}
      </div>

      {clock.status === "building" && (
        <div className={own.info} data-builder-ui aria-live="polite">
          {height !== null && <span className={own.height}>Torre: {heightLabel(height)}</span>}
          {view.parcel && <span>Tu franja es la iluminada</span>}
          <span className={own.members}>{members.map((m) => (m.nickname === view.me.nickname ? "Tú" : m.nickname)).join(" · ")}</span>
        </div>
      )}

      {connection !== "connected" && connection !== "initialized" && connection !== "connecting" && clock.status === "building" && (
        <p className={own.offline} role="status" data-builder-ui>
          Sin conexión con tu equipo. Lo que pongas se manda al volver la señal.
        </p>
      )}

      {clock.status === "lobby" && (
        <div className={styles.backdrop} data-builder-ui>
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="tm-lobby">
            <p className={styles.kicker}>
              <span className={styles.kindDot} style={{ background: identity.color }} aria-hidden="true" /> {view.title}
            </p>
            <h2 id="tm-lobby" className={styles.title}>
              ¡Estás en el {identity.name}!
            </h2>
            <p className={styles.prompt}>{view.prompt}</p>
            <ul className={own.roster} aria-label="Tu equipo">
              {members.map((m) => (
                <li key={m.slot}>
                  <i style={{ background: identity.color }} aria-hidden="true" />
                  {m.nickname}
                  {m.nickname === view.me.nickname && <span> (tú)</span>}
                </li>
              ))}
            </ul>
            <p className={own.wait}>
              <span className={own.pulse} aria-hidden="true" /> Esperando la señal del anfitrión para empezar
            </p>
          </div>
        </div>
      )}

      {clock.status === "finished" && (
        <div className={styles.backdrop} data-builder-ui>
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="tm-end">
            <p className={styles.kicker}>{view.title}</p>
            <h2 id="tm-end" className={styles.title}>
              ¡Tiempo! Miren el proyector
            </h2>
            <ul className={styles.rules}>
              <li>
                <b>{engine.world.bricks.size}</b>
                <span>piezas del equipo</span>
              </li>
              <li>
                <b>{myPlaced}</b>
                <span>{myPlaced === 1 ? "pieza puesta por ti" : "piezas puestas por ti"}</span>
              </li>
              {height !== null && (
                <li>
                  <b>{heightLabel(height)}</b>
                  <span>de alto</span>
                </li>
              )}
            </ul>
            <p className={styles.muted}>La obra de tu equipo quedó guardada. El anfitrión la va a mostrar junto a las demás.</p>
          </div>
        </div>
      )}
    </>
  );
}
