"use client";

// Fase 0 (prueba técnica de tiempo real). Se borra cuando exista el módulo en vivo.

import { useEffect, useEffectEvent, useState } from "react";
import * as Ably from "ably";
import { PROBE_CHANNEL } from "@/lib/live-probe";

interface Options {
  onMessage: (msg: Ably.InboundMessage) => void;
  /** Entrar a la presencia del canal (los jugadores); el host solo la observa. */
  enterPresence?: { nickname: string };
  watchPresence?: boolean;
}

export function useProbeChannel({ onMessage, enterPresence, watchPresence }: Options) {
  const [state, setState] = useState<Ably.ConnectionState>("initialized");
  const [present, setPresent] = useState(0);
  const handleMessage = useEffectEvent(onMessage);

  const nickname = enterPresence?.nickname;

  useEffect(() => {
    // authUrl: el token lo firma el servidor; la API key nunca llega al navegador.
    const realtime = new Ably.Realtime({ authUrl: "/api/live/token", authMethod: "GET" });
    const channel = realtime.channels.get(PROBE_CHANNEL);

    // Al desmontar, close() rechaza lo que siga pendiente (attach, enter): no es un error.
    const ignoreClosed = () => {};

    realtime.connection.on((change) => setState(change.current));
    channel.subscribe((msg) => handleMessage(msg)).catch(ignoreClosed);

    async function refreshPresence() {
      const members = await channel.presence.get();
      setPresent(members.filter((m) => m.clientId.startsWith("anon:")).length);
    }
    if (watchPresence) {
      channel.presence.subscribe(() => void refreshPresence().catch(ignoreClosed)).catch(ignoreClosed);
      refreshPresence().catch(ignoreClosed);
    }
    if (nickname) channel.presence.enter({ nickname }).catch(ignoreClosed);

    return () => realtime.close();
  }, [nickname, watchPresence]);

  return { state, present };
}
