"use client";

// Pantalla del anfitrión de la construcción en equipo (fase 6): el proyector es el escenario y el
// celular es el taller (investigación, 6.4). Lobby con PIN y QR, todas las obras creciendo en vivo
// en una sola escena 3D, reloj grande y, al final, un recorrido de cámara por cada equipo, la
// galería con votación (opcional) y el mural para la empresa.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Ably from "ably";
import type { SessionView, TeamView } from "@/lib/brick-session";
import type { HostGallery } from "@/lib/brick-gallery";
import { hostChannel, sessionChannel, teamChannel } from "@/lib/bricks/channels";
import type { Op } from "@/lib/bricks/ops";
import type { Brick } from "@/lib/bricks/world";
import { SeqQueue } from "@/lib/bricks/sync";
import { MIN_GALLERY_WORKS } from "@/lib/bricks/gallery";
import { getTeamMode, heightLabel, phoneRound, phoneScores, relayTurn, towerHeight, twistDue } from "@/lib/bricks/team";
import QrCode from "@/components/live/QrCode";
import { downloadBlob, drawMural, toJpeg } from "../mural";
import { CityView } from "./city";
import GalleryStage from "./GalleryStage";
import styles from "./host.module.css";

interface Snapshot {
  session: SessionView;
  teams: TeamView[];
  ablyMessages: number;
  gallery: HostGallery;
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
  /** Lo que se muestra de cada obra, recalculado con cada lote (la escena 3D no se lee al dibujar). */
  const [live, setLive] = useState(() => new Map(initial.teams.map((t) => [t.id, stats(t.position, t.bricks, initial.session.base)])));
  const positions = useRef(new Map(initial.teams.map((t) => [t.id, t.position])));
  const [tour, setTour] = useState<{ on: boolean; index: number }>({ on: false, index: 0 });
  const { session } = snap;
  const mode = getTeamMode(session.mode)!;
  const players = snap.teams.reduce((n, t) => n + t.members.length, 0);

  const measure = useCallback((teamId: number) => {
    const city = cityRef.current;
    if (!city) return;
    const bricks = city.bricksOf(teamId);
    setLive((m) => new Map(m).set(teamId, stats(positions.current.get(teamId) ?? 0, bricks, session.base)));
  }, [session.base]);

  /** Foto completa del servidor: al conectar, cuando entra gente y cuando falta un lote. */
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/bricks/host/${session.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const next = (await res.json()) as Snapshot;
    setSnap(next);
    setOffset(next.session.serverNow - Date.now());
    for (const t of next.teams) {
      positions.current.set(t.id, t.position);
      cityRef.current?.setTeam(t.id, t.color, t.bricks);
      queues.current.set(t.id, new SeqQueue(t.seq));
      measure(t.id);
    }
  }, [session.id, measure]);

  // Escena 3D: una sola para todas las obras.
  useEffect(() => {
    const canvas = canvasRef.current!;
    // Calidad media: la escena gira todo el tiempo (la oclusión ambiental solo se ve quieta) y un
    // proyector a 1080p no gana nada con dibujar al doble de resolución.
    const city = new CityView(canvas, "medio", initial.session.base);
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
      await pub.subscribe("gallery", later);
      await host.subscribe("roster", later);
      await host.subscribe("votes", later);
      // Lo que pasó mientras la pantalla se conectaba (o durante un corte) no llegó: se trae la foto.
      host.on("attached", (change) => {
        if (!change.resumed) later();
      });
      later();
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

  const galleryCommand = useCallback(
    async (action: "open" | "reveal") => {
      setPending(action);
      setError(null);
      try {
        const res = await fetch(`/api/bricks/host/${session.id}/gallery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) setError(body.error ?? "No se pudo.");
        else {
          if (action === "open") stopTour();
          void refresh();
        }
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

  // Al terminar, el proyector toma la foto de cada obra y la sube: es el único que las tiene todas en
  // su escena. Sirven para votar en el celular, para el reporte y para el mural.
  const [photosBusy, setPhotosBusy] = useState(false);
  // Si una subida falla, la lista no cambia y no se reintenta en bucle: se reintenta al volver a la pantalla.
  const missingKey =
    session.status === "finished"
      ? snap.teams
          .filter((t) => t.bricks.length > 0 && !snap.gallery.photos.includes(t.id))
          .map((t) => t.id)
          .join(",")
      : "";
  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    (async () => {
      // Un momento para que entren los últimos lotes antes de la foto.
      await new Promise((ok) => setTimeout(ok, 800));
      if (cancelled) return;
      setPhotosBusy(true);
      for (const id of missingKey.split(",").map(Number)) {
        if (cancelled) return;
        const png = cityRef.current?.photo(id);
        const jpeg = png ? await toJpeg(png, 1200).catch(() => null) : null;
        if (!jpeg) continue;
        const form = new FormData();
        form.set("team", String(id));
        form.set("image", jpeg, "obra.jpg");
        await fetch(`/api/bricks/host/${session.id}/photo`, { method: "POST", body: form }).catch(() => null);
      }
      if (!cancelled) {
        setPhotosBusy(false);
        void refresh();
      }
    })();
    return () => {
      cancelled = true;
      setPhotosBusy(false);
    };
  }, [missingKey, session.id, refresh]);

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

  // Recorrido del cierre: un equipo cada TOUR_MS. Se salta las obras que su equipo no quiso mostrar.
  const shown = snap.teams.filter((t) => !snap.gallery.hidden.includes(t.id));
  const teamCount = shown.length;
  useEffect(() => {
    if (!tour.on || teamCount === 0) return;
    const t = shown[tour.index % teamCount];
    cityRef.current?.focus(t.id);
    const id = setTimeout(() => setTour((x) => ({ ...x, index: (x.index + 1) % teamCount })), TOUR_MS);
    return () => clearTimeout(id);
    // `shown` cambia de identidad en cada render; basta con su tamaño y el índice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, teamCount]);

  function stopTour() {
    setTour({ on: false, index: 0 });
    cityRef.current?.showAll();
  }

  /** En los resultados la cámara va a la obra ganadora; sin ganador, vista de todas. */
  const focusWinner = useCallback((teamId: number | null) => {
    if (teamId === null) cityRef.current?.showAll();
    else cityRef.current?.focus(teamId);
  }, []);

  const [muralBusy, setMuralBusy] = useState(false);
  const downloadMural = async () => {
    setMuralBusy(true);
    try {
      const badges = new Map<number, string[]>();
      for (const r of snap.gallery.results ?? []) for (const w of r.winners) badges.set(w.teamId, [...(badges.get(w.teamId) ?? []), r.title]);
      const items = shown
        .filter((t) => snap.gallery.photos.includes(t.id))
        .map((t) => ({ src: `/api/bricks/photo/${t.id}`, title: t.name, color: t.color, subtitle: t.members.map((m) => m.nickname).join(" · "), badges: badges.get(t.id) }));
      const date = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
      const blob = await drawMural({ heading: mode.title, subheading: `${date} · ${items.length} ${items.length === 1 ? "obra" : "obras"} en equipo`, items });
      if (blob) downloadBlob(blob, `mural-${session.pin}.png`);
      else setError("No se pudo armar el mural.");
    } catch {
      setError("No se pudo armar el mural.");
    } finally {
      setMuralBusy(false);
    }
  };

  const ranked = [...snap.teams].sort((a, b) =>
    mode.play === "juntos" ? (live.get(b.id)?.height ?? 0) - (live.get(a.id)?.height ?? 0) : a.position - b.position,
  );
  const touring = tour.on ? (shown[tour.index % Math.max(1, teamCount)] ?? null) : null;
  const gallery = snap.gallery;
  const hiddenCount = snap.teams.filter((t) => gallery.hidden.includes(t.id)).length;

  // Relevo y Teléfono Roto: turno, ronda y sorpresa con el mismo reloj que los celulares.
  const serverNow = now + offset;
  const started = session.status === "building" && session.startedMs !== null ? session.startedMs : null;
  const twist = mode.twist && started !== null && twistDue(started, session.timeLimit, serverNow) ? mode.twist : null;
  const round = mode.play === "telefono" && started !== null ? phoneRound(started, session.timeLimit, serverNow) : null;
  /** Qué se ve al lado de cada equipo en el tablero. */
  const statOf = (t: TeamView): string => {
    const stats = live.get(t.id);
    const count = stats?.count ?? t.bricks.length;
    if (mode.play === "juntos") return heightLabel(stats?.height ?? 0);
    if (mode.play === "relevo" && started !== null) {
      const turn = relayTurn(t.members.map((m) => m.slot), started, serverNow);
      return `Turno: ${t.members.find((m) => m.slot === turn.slot)?.nickname ?? "nadie"}`;
    }
    if (mode.play === "telefono" && session.status === "finished") {
      const [a, b] = stats?.scores ?? [0, 0];
      return `${Math.round(a * 100)} % y ${Math.round(b * 100)} %`;
    }
    return `${count} ${count === 1 ? "pieza" : "piezas"}`;
  };

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

      {session.status !== "lobby" && gallery.status !== "voting" && (
        <aside className={styles.board} aria-label="Equipos">
          {session.status === "building" && <p className={styles.boardPrompt}>{mode.prompt}</p>}
          {round !== null && (
            <p className={styles.boardPrompt}>
              <b>Ronda {round + 1} de 2.</b> {round === 0 ? "A mitad del tiempo cambian de rol, con otro modelo." : "Cambiaron de rol: ahora describe quien antes construía."}
            </p>
          )}
          {twist && <p className={`${styles.boardPrompt} ${styles.twist}`}>{twist}</p>}
          <ol className={styles.ranking}>
            {ranked.map((t, n) => {
              return (
                <li key={t.id} style={{ "--team": t.color } as React.CSSProperties} aria-current={touring?.id === t.id || undefined}>
                  {mode.play === "juntos" && <span className={styles.place}>{n + 1}</span>}
                  <span className={styles.teamName}>
                    <i aria-hidden="true" />
                    {t.name}
                  </span>
                  <span className={styles.stat}>
                    {statOf(t)}
                  </span>
                </li>
              );
            })}
          </ol>
          {error && <p className={styles.error}>{error}</p>}
        </aside>
      )}

      {session.status === "finished" && gallery.status !== null && (
        <GalleryStage
          gallery={gallery}
          teams={snap.teams}
          pending={!!pending}
          onReveal={() => galleryCommand("reveal")}
          onFocus={focusWinner}
          onMural={downloadMural}
          muralBusy={muralBusy}
        />
      )}

      {session.status === "finished" && gallery.status === null && (
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
              {mode.play === "juntos" && <p className={styles.spotStat}>{heightLabel(live.get(touring.id)?.height ?? 0)} de alto</p>}
              {mode.play === "telefono" && (
                <p className={styles.spotStat}>
                  {(live.get(touring.id)?.scores ?? [0, 0])
                    .map((sc, r) => `Ronda ${r + 1}: ${Math.round(sc * 100)} % parecido`)
                    .join(" · ")}
                </p>
              )}
            </div>
          ) : (
            <div className={styles.spot}>
              <p className={styles.spotName}>¡Tiempo!</p>
              <p className={styles.spotMembers}>Así quedaron las obras. Recórranlas equipo por equipo y que cada uno cuente la suya.</p>
            </div>
          )}
          {hiddenCount > 0 && (
            <p className={styles.notice}>
              {hiddenCount === 1 ? "Un equipo prefirió no mostrar su obra: no sale en el recorrido, la galería ni el mural." : `${hiddenCount} equipos prefirieron no mostrar su obra: no salen en el recorrido, la galería ni el mural.`}
            </p>
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
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => galleryCommand("open")}
              disabled={!!pending || photosBusy || gallery.order.length < MIN_GALLERY_WORKS}
              title={gallery.order.length < MIN_GALLERY_WORKS ? "Hacen falta al menos dos obras para votar" : "Cada persona vota desde su celular, por categorías"}
            >
              {photosBusy ? "Tomando las fotos…" : "Abrir la votación"}
            </button>
            <button type="button" className={styles.ghostBtn} onClick={downloadMural} disabled={muralBusy || photosBusy || gallery.photos.length === 0}>
              {muralBusy ? "Armando el mural…" : "Descargar el mural"}
            </button>
            <Link href={`/admin/reporte/equipos/${session.id}`} className={styles.back} target="_blank">
              Reporte ›
            </Link>
            <span className={styles.meter} title="Estimado: cada publicación por cada pantalla que la recibe">
              {snap.ablyMessages.toLocaleString("es-CO")} mensajes de tiempo real
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function stats(position: number, bricks: Brick[], base: number) {
  return { count: bricks.length, height: towerHeight(bricks, base), scores: phoneScores(position, bricks) };
}
