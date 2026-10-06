"use client";

import { useEffect, useEffectEvent, useState } from "react";
import * as Ably from "ably";
import { hostChannel, matchChannel, type HostEvent, type PublicEvent } from "@/lib/live-protocol";

interface Options {
  matchId: number;
  /** El host también escucha su canal privado (contador de respuestas, jugadores). */
  role: "host" | "player";
  onPublic: (event: PublicEvent) => void;
  onHost?: (event: HostEvent) => void;
  /**
   * Pedir la foto completa del estado. Se llama al conectar y cada vez que Ably no
   * pudo recuperar los mensajes perdidos durante un corte (attach sin "resumed").
   */
  onResync: () => void;
}

export function useLiveChannel({ matchId, role, onPublic, onHost, onResync }: Options) {
  const [connection, setConnection] = useState<Ably.ConnectionState>("initialized");
  // Solo para el jugador: true cuando la pantalla del host lleva un rato fuera.
  const [hostGone, setHostGone] = useState(false);
  const handlePublic = useEffectEvent(onPublic);
  const handleHost = useEffectEvent((e: HostEvent) => onHost?.(e));
  const resync = useEffectEvent(onResync);

  useEffect(() => {
    const authUrl = role === "host" ? `/api/live/token?match=${matchId}` : "/api/live/token";
    const realtime = new Ably.Realtime({ authUrl, authMethod: "GET" });
    let closed = false;

    realtime.connection.on((change) => setConnection(change.current));

    const pub = realtime.channels.get(matchChannel(matchId));
    pub.on("attached", (change) => {
      if (!change.resumed) resync();
    });

    // Attach explícito antes de suscribirse: close() al desmontar rechaza lo que
    // siga pendiente y el SDK no maneja ese rechazo en sus attach internos.
    (async () => {
      await pub.attach();
      if (closed) return;
      await pub.subscribe((msg) => handlePublic({ name: msg.name, data: msg.data } as PublicEvent));
      if (role === "player") {
        // Un parpadeo de red o recargar el proyector no debe asustar a nadie: se avisa
        // solo si el host sigue fuera después de HOST_GONE_MS.
        let timer: ReturnType<typeof setTimeout> | undefined;
        const check = async () => {
          const members = await pub.presence.get();
          if (closed) return;
          if (members.some((m) => m.clientId?.startsWith("host:"))) {
            clearTimeout(timer);
            timer = undefined;
            setHostGone(false);
          } else if (!timer) {
            timer = setTimeout(() => !closed && setHostGone(true), HOST_GONE_MS);
          }
        };
        await pub.presence.subscribe(() => void check().catch(() => {}));
        await check();
      }
      if (role === "host") {
        // Si la presencia falla, el host igual debe recibir sus eventos.
        await pub.presence.enter().catch(() => {});
        if (closed) return;
        const host = realtime.channels.get(hostChannel(matchId));
        await host.attach();
        if (closed) return;
        await host.subscribe((msg) => handleHost({ name: msg.name, data: msg.data } as HostEvent));
      }
    })().catch(() => {
      // Solo falla por close() al desmontar; los cortes de red los reintenta Ably.
    });

    return () => {
      closed = true;
      realtime.close();
    };
  }, [matchId, role]);

  return { connection, hostGone };
}

const HOST_GONE_MS = 8000;

/**
 * Diferencia entre el reloj del servidor y el del dispositivo. Los eventos traen
 * `serverNow`; la cuenta regresiva usa `Date.now() + offset` para no depender de la
 * hora del celular.
 */
export const clockOffset = (serverNow: number) => serverNow - Date.now();
