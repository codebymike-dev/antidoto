// Nombres de los canales de Ably de la construcción en equipo. Los comparten el servidor (que
// publica) y el navegador (que escucha). El entorno va en el nombre, como en el quiz en vivo:
// local, preview y producción comparten la app de Ably y cada base numera desde 1.

const CHANNEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV ?? "local";

/** Canal público de la sesión: estado y reloj, lo escuchan todos. */
export const sessionChannel = (id: number) => `bricks:${CHANNEL_ENV}:${id}`;
/** Canal de cada equipo: solo sus operaciones, así los mensajes no se multiplican por toda la sala. */
export const teamChannel = (id: number, teamId: number) => `bricks:${CHANNEL_ENV}:${id}:t${teamId}`;
/** Prefijo con comodín: el proyector escucha todos los equipos de su sesión. */
export const hostChannels = (id: number) => `bricks:${CHANNEL_ENV}:${id}:*`;
/** Avisos solo para el proyector (gente que entra): no hace falta mandarlos a cada celular. */
export const hostChannel = (id: number) => `bricks:${CHANNEL_ENV}:${id}:host`;
