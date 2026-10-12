"use client";

// Pantalla del anfitrión de la construcción en equipo (fase 6): el proyector es el escenario y el
// celular es el taller (investigación, 6.4). Lobby con PIN y QR, todas las obras creciendo en vivo
// en una sola escena 3D, reloj grande y, al final, un recorrido de cámara por cada equipo.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Ably from "ably";
import type { SessionView, TeamView } from "@/lib/brick-session";
import { hostChannel, sessionChannel, teamChannel } from "@/lib/bricks/channels";
import type { Op } from "@/lib/bricks/ops";
import { SeqQueue } from "@/lib/bricks/sync";
import { getTeamMode, heightLabel, towerHeight } from "@/lib/bricks/team";
import QrCode from "@/components/live/QrCode";
import { CityView } from "./city";
import styles from "./host.module.css";

interface Snapshot {
  session: SessionView;
  teams: TeamView[];
  ablyMessages: number;
}

interface Props {
  initial: Snapshot;
  joinHost: string;
  joinUrl: string;
}

const TOUR_MS = 7000;

function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function HostScreen({ initial, joinHost, joinUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cityRef = useRef<CityView | null>(null);
  const queues = useRef(new Map<number, SeqQueue>());
  const [snap, setSnap] = useState<Snapshot>(initial);
  const [offset, setOffset] = useState(() => initial.session.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Piezas y altura por equipo, recalculadas con cada lote. */
  const [live, setLive] = useState(
    () => new Map(initial.teams.map((t) => [t.id, { count: t.bricks.length, height: towerHeight(t.bricks, initial.session.base) }])),
  );
  const [tour, setTour] = useState<{ on: boolean; index: number }>({ on: false, index: 0 });
  const { session } = snap;
  const mode = getTeamMode(session.mode)!;
  const players = snap.teams.reduce((n, t) => n + t.members.length, 0);

  const measure = useCallback((teamId: number) => {
    const city = cityRef.current;
    if (!city) return;
    const bricks = city.bricksOf(teamId);
    setLive((m) => new Map(m).set(teamId, { count: bricks.length, height: towerHeight(bricks, session.base) }));
  }, [session.base]);

  /** Foto completa del servidor: al conectar, cuando entra gente y cuando falta un lote. */
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/bricks/host/${session.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const next = (await res.json()) as Snapshot;
    setSnap(next);
    setOffset(next.session.serverNow - Date.now());
    for (const t of next.teams) {
      cityRef.current?.setTeam(t.id, t.color, t.bricks);
      queues.current.set(t.id, new SeqQueue(t.seq));
      measure(t.id);
    }
  }, [session.id, measure]);

  // Escena 3D: una sola para todas las obras.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const city = new CityView(canvas, "alto", initial.session.base);
    cityRef.current = city;
    for (const t of initial.teams) {
      city.setTeam(t.id, t.color, t.bricks);
      queues.current.set(t.id, new SeqQueue(t.seq));
    }
    const parent = canvas.parentElement!;
    const ro = new ResizeObserver(() => city.resize(parent.clientWidth, parent.clientHeight));
    ro.observe(parent);
    city.resize(parent.clientWidth, parent.clientHeight);
    return () => {
      ro.disconnect();
      city.dispose();
      cityRef.current = null;
    };
  }, [initial]);

  // Tiempo real: sesión, avisos del proyector y el canal de cada equipo.
  const teamIds = snap.teams.map((t) => t.id).join(",");
  useEffect(() => {
    const realtime = new Ably.Realtime({ authUrl: `/api/bricks/token?session=${session.id}`, authMethod: "GET" });
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 400);
    };
    (async () => {
      const pub = realtime.channels.get(sessionChannel(session.id));
      const host = realtime.channels.get(hostChannel(session.id));
      await Promise.all([pub.attach(), host.attach()]);
      if (closed) return;
      await pub.subscribe("status", (msg) => {
        const d = msg.data as { status: SessionView["status"]; startedMs: number | null; endsMs: number | null; serverNow: number };
        setOffset(d.serverNow - Date.now());
        setSnap((s) => ({ ...s, session: { ...s.session, status: d.status, startedMs: d.startedMs, endsMs: d.endsMs } }));
      });
      await host.subscribe("roster", later);
      for (const id of teamIds.split(",").filter(Boolean).map(Number)) {
        const ch = realtime.channels.get(teamChannel(session.id, id));
        ch.on("attached", (change) => {
          if (!change.resumed) later();
        });
        await ch.attach();
        if (closed) return;
        await ch.subscribe("ops", (msg) => {
          const d = msg.data as { seq: number; ops: Op[] };
          const q = queues.current.get(id);
          if (!q) return later();
          for (const b of q.push({ seq: d.seq, mine: false, ops: d.ops }, Date.now())) {
            if (!cityRef.current?.applyOps(id, b.ops)) return later();
          }
          if (q.stalled(Date.now())) later();
          measure(id);
        });
        await ch.subscribe("members", (msg) => {
          const members = (msg.data as { members: TeamView["members"] }).members;
          setSnap((s) => ({ ...s, teams: s.teams.map((t) => (t.id === id ? { ...t, members } : t)) }));
        });
      }
    })().catch(() => {
      // Solo falla por close() al desmontar; los cortes los reintenta Ably.
    });
    return () => {
      closed = true;
      clearTimeout(timer);
      realtime.close();
    };
  }, [session.id, teamIds, refresh, measure]);

  const remaining = session.endsMs === null ? null : session.endsMs - (now + offset);
  const command = useCallback(
    async (action: "start" | "finish" | "extend") => {
      setPending(action);
      setError(null);
      try {
        const res = await fetch(`/api/bricks/host/${session.id}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) setError(body.error ?? "No se pudo.");
        else void refresh();
      } catch {
        setError("Sin conexión con el servidor.");
      } finally {
        setPending(null);
      }
    },
    [session.id, refresh],
  );

  useEffect(() => {
    cityRef.current?.setSpin(session.status !== "lobby");
  }, [session.status]);

  // Reloj. Al llegar a cero la sala se cierra sola; el servidor también la cierra si esta pantalla no está.
  const finishing = useRef(false);
  const { status, endsMs } = session;
  useEffect(() => {
    if (status !== "building") return;
    finishing.current = false;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (endsMs !== null && endsMs - (t + offset) <= 0 && !finishing.current) {
        finishing.current = true;
        void command("finish");
      }
    }, 250);
    return () => clearInterval(id);
  }, [status, endsMs, offset, command]);

  // Recorrido del cierre: un equipo cada TOUR_MS.
  const teamCount = snap.teams.length;
  useEffect(() => {
    if (!tour.on || teamCount === 0) return;
    const t = snap.teams[tour.index % teamCount];
    cityRef.current?.focus(t.id);
    const id = setTimeout(() => setTour((x) => ({ ...x, index: (x.index + 1) % teamCount })), TOUR_MS);
    return () => clearTimeout(id);
  }, [tour, teamCount, snap.teams]);

  const stopTour = () => {
    setTour({ on: false, index: 0 });
    cityRef.current?.showAll();
  };

  const ranked = [...snap.teams].sort((a, b) =>
    mode.key === "torre-equipos" ? (live.get(b.id)?.height ?? 0) - (live.get(a.id)?.height ?? 0) : a.position - b.position,
  );
  const touring = tour.on ? snap.teams[tour.index % Math.max(1, teamCount)] : null;

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <header className={styles.top}>
        <Link href="/admin/biblioteca?tipo=construccion" className={styles.back}>
          ‹ Biblioteca
        </Link>
        <div className={styles.titleBox}>
          <p className={styles.kicker}>Bricks Serious Play · en equipo</p>
          <h1 className={styles.title}>{mode.title}</h1>
        </div>
        {session.status === "building" && remaining !== null && (
          <span className={`${styles.clock} ${remaining <= 30000 ? styles.clockWarn : ""}`} role="timer">
            {formatClock(remaining)}
          </span>
        )}
        {session.status !== "lobby" && (
          <span className={styles.pinSmall}>
            PIN <b>{session.pin}</b>
          </span>
        )}
        {session.status === "building" && (
          <>
            <button type="button" className={styles.ghostBtn} onClick={() => command("extend")} disabled={!!pending}>
              ＋1 min
            </button>
            <button type="button" className={styles.dangerBtn} onClick={() => command("finish")} disabled={!!pending}>
              Terminar
            </button>
          </>
        )}
      </header>

      {session.status === "lobby" && (
        <section className={styles.lobby} aria-labelledby="bh-lobby">
          <div className={styles.join}>
            <p className={styles.kicker}>Entren desde el celular</p>
            <p className={styles.url}>
              {joinHost}/construir
            </p>
            <p className={styles.pinLabel}>PIN</p>
            <p className={styles.pin} id="bh-lobby">
              {session.pin.slice(0, 3)} {session.pin.slice(3)}
            </p>
            <QrCode value={joinUrl} size={200} label={`Código QR para entrar con el PIN ${session.pin}`} />
            <p className={styles.prompt}>{mode.prompt}</p>
          </div>
          <div className={styles.teams}>
            <div className={styles.teamsHead}>
              <h2>
                {players === 0 ? "Esperando a la gente" : `${players} ${players === 1 ? "persona" : "personas"} en ${snap.teams.length} ${snap.teams.length === 1 ? "equipo" : "equipos"}`}
              </h2>
              <span>
                Equipos de {session.teamSize} · {formatClock(session.timeLimit * 1000)} min
              </span>
            </div>
            <ul className={styles.teamGrid}>
              {snap.teams.map((t) => (
                <li key={t.id} style={{ "--team": t.color } as React.CSSProperties}>
                  <p className={styles.teamName}>
                    <i aria-hidden="true" />
                    {t.name}
                  </p>
                  <ul>
                    {t.members.map((m) => (
                      <li key={m.slot}>{m.nickname}</li>
                    ))}
                    {Array.from({ length: Math.max(0, session.teamSize - t.members.length) }, (_, n) => (
                      <li key={`v${n}`} className={styles.empty}>
                        libre
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {error && <p className={styles.error}>{error}</p>}
            <button type="button" className={styles.startBtn} onClick={() => command("start")} disabled={players === 0 || !!pending}>
              {pending === "start" ? "Empezando…" : players === 0 ? "Esperando a la primera persona" : "¡A construir!"}
            </button>
          </div>
        </section>
      )}

      {session.status !== "lobby" && (
        <aside className={styles.board} aria-label="Equipos">
          {session.status === "building" && <p className={styles.boardPrompt}>{mode.prompt}</p>}
          <ol className={styles.ranking}>
            {ranked.map((t, n) => {
              const stats = live.get(t.id);
              return (
                <li key={t.id} style={{ "--team": t.color } as React.CSSProperties} aria-current={touring?.id === t.id || undefined}>
                  {mode.key === "torre-equipos" && <span className={styles.place}>{n + 1}</span>}
                  <span className={styles.teamName}>
                    <i aria-hidden="true" />
                    {t.name}
                  </span>
                  <span className={styles.stat}>
                    {mode.key === "torre-equipos" ? heightLabel(stats?.height ?? 0) : `${stats?.count ?? t.bricks.length} piezas`}
                  </span>
                </li>
              );
            })}
          </ol>
          {error && <p className={styles.error}>{error}</p>}
        </aside>
      )}

      {session.status === "finished" && (
        <div className={styles.end}>
          {touring ? (
            <div className={styles.spot} style={{ "--team": touring.color } as React.CSSProperties}>
              <p className={styles.spotName}>
                <i aria-hidden="true" />
                {touring.name}
              </p>
              <p className={styles.spotMembers}>
                {touring.members.map((m) => `${m.nickname} (${m.placed})`).join(" · ")}
              </p>
              {mode.key === "torre-equipos" && <p className={styles.spotStat}>{heightLabel(live.get(touring.id)?.height ?? 0)} de alto</p>}
            </div>
          ) : (
            <div className={styles.spot}>
              <p className={styles.spotName}>¡Tiempo!</p>
              <p className={styles.spotMembers}>Así quedaron las obras. Recórranlas equipo por equipo y que cada uno cuente la suya.</p>
            </div>
          )}
          <div className={styles.endActions}>
            {tour.on ? (
              <button type="button" className={styles.ghostBtn} onClick={stopTour}>
                Ver todas
              </button>
            ) : (
              <button type="button" className={styles.startBtn} onClick={() => setTour({ on: true, index: 0 })} disabled={teamCount === 0}>
                Recorrer las obras
              </button>
            )}
            <span className={styles.meter} title="Estimado: cada publicación por cada pantalla que la recibe">
              {snap.ablyMessages.toLocaleString("es-CO")} mensajes de tiempo real
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
