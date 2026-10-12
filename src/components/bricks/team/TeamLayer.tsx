"use client";

// Lo que agrega el modo equipos al constructor (fase 6 de docs/plan-construccion-3d.md): espera en
// el lobby, reloj de la sesión, compañeros, franja propia en Obra en Equipo, altura en La Torre y
// el cierre. La conexión con el equipo vive en TeamSync, fuera de React.

import { useEffect, useState } from "react";
import type * as Ably from "ably";
import type { PlayerView } from "@/lib/brick-session";
import { canBuildPhone, heightLabel, phoneArea, phoneModel, phoneRound, phoneScores, PHONE_W, relayTurn, towerHeight, twistDue } from "@/lib/bricks/team";
import { brickSound } from "../sound";
import type { BuilderEngine, BuilderSnapshot } from "../builder/engine";
import { TeamSync, type TeamClock, type TeamMember } from "./team-sync";
import TeamClosing from "./TeamClosing";
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
  const [clock, setClock] = useState<TeamClock>(() => ({
    status: session.status,
    startedMs: session.startedMs,
    endsMs: session.endsMs,
    offset: session.serverNow - Date.now(),
  }));
  /** Foto del modelo secreto (Teléfono Roto), de la ronda y el ángulo en que se pidió. */
  const [model, setModel] = useState<{ round: 0 | 1; angle: number; url: string | null; open: boolean } | null>(null);
  const [members, setMembers] = useState<TeamMember[]>(team.members);
  const [connection, setConnection] = useState<Ably.ConnectionState>("initialized");
  const [lost, setLost] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [gallerySignal, setGallerySignal] = useState(0);

  useEffect(() => {
    const sync = new TeamSync(engine, { session, team, me: view.me }, {
      onClock: (c) => {
        setClock(c);
        onStatus(c.status);
      },
      onMembers: setMembers,
      onConnection: setConnection,
      onLost: setLost,
      onGallery: () => setGallerySignal((n) => n + 1),
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

  // Turnos (Relevo) y rondas (Teléfono Roto) se calculan igual que en el servidor, con su reloj.
  const serverNow = now + clock.offset;
  const building = clock.status === "building" && clock.startedMs !== null;
  const slots = members.map((m) => m.slot);
  const turn = session.play === "relevo" && building ? relayTurn(slots, clock.startedMs!, serverNow) : null;
  const turnOwner = turn ? members.find((m) => m.slot === turn.slot) : undefined;
  const myTurn = turn ? turn.slot === view.me.slot : null;
  const round = session.play === "telefono" && clock.startedMs !== null ? phoneRound(clock.startedMs, session.timeLimit, serverNow) : null;
  const iBuild = round === null ? true : canBuildPhone(view.me.slot, round, slots);
  const partner = members.find((m) => m.slot !== view.me.slot);
  const twist = session.twist && building && twistDue(clock.startedMs!, session.timeLimit, serverNow) ? session.twist : null;

  const readOnly = !building
    ? null
    : myTurn === false
      ? `Ahora le toca a ${turnOwner?.nickname ?? "otra persona"}. Mira y prepara tu idea`
      : !iBuild
        ? `En esta ronda describes: ${partner?.nickname ?? "tu pareja"} construye`
        : null;
  useEffect(() => {
    engine.setReadOnly(readOnly);
  }, [engine, readOnly]);
  useEffect(() => {
    if (round !== null) engine.setParcel(phoneArea(round));
  }, [engine, round]);
  useEffect(() => {
    if (myTurn) {
      brickSound().play("pick");
      engine.notify("¡Te toca! Tienes 45 segundos");
    }
  }, [engine, myTurn]);
  useEffect(() => {
    if (round === 1 && building) engine.notify("¡Cambio de rol! Ahora con otro modelo");
  }, [engine, round, building]);
  useEffect(() => {
    if (twist) engine.notify(twist);
  }, [engine, twist]);

  const showModel = (angle: number) => {
    if (round === null) return;
    setModel({ round, angle, url: engine.modelPhoto(phoneModel(team.position, round).bricks, PHONE_W, angle), open: true });
  };

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

      {building && turn && (
        <p className={`${own.turn} ${myTurn ? own.turnMine : ""}`} data-builder-ui role="status">
          {myTurn ? "¡Te toca!" : `Turno de ${turnOwner?.nickname ?? "otra persona"}`} · {formatClock(turn.endsMs - serverNow)}
        </p>
      )}

      {building && round !== null && (
        <div className={own.turn} data-builder-ui role="status">
          Ronda {round + 1} de 2 · {iBuild ? (partner ? `Construyes: escucha a ${partner.nickname}` : "Construyes") : "Describes el modelo"}
          {!iBuild && (
            <button type="button" className={own.modelBtn} onClick={() => showModel(model?.round === round ? model.angle : 0)}>
              Ver el modelo secreto
            </button>
          )}
        </div>
      )}

      {model?.open && model.round === round && !iBuild && (
        <div className={styles.backdrop} onClick={() => setModel({ ...model, open: false })} data-builder-ui>
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="tm-model" onClick={(e) => e.stopPropagation()}>
            <p className={styles.kicker}>Secreto: no muestres la pantalla</p>
            <h2 id="tm-model" className={styles.title}>
              {phoneModel(team.position, model.round).name}
            </h2>
            {/* Data URL dibujada en el navegador: next/image no aporta nada aquí. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {model.url && <img className={styles.photo} src={model.url} alt="El modelo que tienes que describir" />}
            <p className={styles.muted}>
              Cuéntale a {partner?.nickname ?? "tu pareja"} qué piezas usar, de qué color y dónde va cada una. Solo con palabras.
            </p>
            <div className={styles.row}>
              <button type="button" className={styles.secondary} onClick={() => showModel(model.angle + Math.PI / 2)}>
                Verlo por otro lado
              </button>
              <button type="button" className={styles.primary} onClick={() => setModel({ ...model, open: false })} autoFocus>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {clock.status === "building" && (
        <div className={own.info} data-builder-ui aria-live="polite">
          {twist && <span className={own.twist}>{twist}</span>}
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
        <TeamClosing
          engine={engine}
          teamName={identity.name}
          signal={gallerySignal}
          title={view.title}
          summary={
            <>
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
              {session.play === "telefono" && (
                <ul className={own.credits}>
                  {phoneScores(team.position, [...engine.world.bricks.values()]).map((score, r) => (
                    <li key={r}>
                      Ronda {r + 1} ({phoneModel(team.position, r as 0 | 1).name}): <b>{Math.round(score * 100)} % parecido</b>
                    </li>
                  ))}
                </ul>
              )}
              {session.play === "relevo" && (
                <ul className={own.credits} aria-label="Lo que puso cada persona">
                  {members.map((m) => (
                    <li key={m.slot}>
                      {m.nickname}: <b>{m.placed === 1 ? "1 pieza" : `${m.placed} piezas`}</b>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.muted}>La obra de tu equipo quedó guardada. El anfitrión la va a mostrar junto a las demás.</p>
            </>
          }
        />
      )}
    </>
  );
}
