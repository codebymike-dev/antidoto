import "server-only";
import { cookies } from "next/headers";
import { currentUser, type AdminUser } from "./auth";

// Helpers de los Route Handlers de /api/live. Son Route Handlers (no Server Actions)
// para poder probarlos y cargarlos con bots por HTTP; a cambio, la verificación de
// origen que las Server Actions traen de fábrica se hace aquí a mano.

export const PLAYER_COOKIE = "antidoto_live_player";

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const fail = (error: string, status = 400) => json({ error }, status);

/**
 * Las cookies son SameSite=Lax, pero se exige además que el POST venga de este mismo
 * sitio: un formulario de otro dominio no puede disparar acciones con la sesión ajena.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function playerIdFromCookie(): Promise<string | null> {
  const value = (await cookies()).get(PLAYER_COOKIE)?.value;
  return value && /^[0-9a-f]{32}$/.test(value) ? value : null;
}

export async function setPlayerCookie(playerId: string) {
  (await cookies()).set(PLAYER_COOKIE, playerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearPlayerCookie() {
  (await cookies()).delete(PLAYER_COOKIE);
}

/** Guardia de los endpoints del host: sesión de admin y, en POST, mismo origen. */
export async function requireHost(request: Request): Promise<AdminUser | Response> {
  if (request.method !== "GET" && !sameOrigin(request)) return fail("Origen no permitido.", 403);
  const user = await currentUser();
  return user ?? fail("Inicia sesión en el portal.", 401);
}

export function matchIdParam(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
