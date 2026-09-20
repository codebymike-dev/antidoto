import "server-only";
import { randomBytes, scrypt as scryptCb, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { all, one, run } from "./db";
import { companyFilter, type CompanyScope } from "./scope";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const SESSION_COOKIE = "antidoto_session";
const SESSION_DAYS = 7;
const KEY_LENGTH = 64;

export interface AdminUser {
  id: number;
  username: string;
  role: "super" | "empresa";
  company_id: number | null;
  company_name: string | null;
  notifications_read_at: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(adminUserId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await run("INSERT INTO sessions (token_hash, admin_user_id, expires_at) VALUES (?, ?, ?)", [
    hashToken(token),
    adminUserId,
    expiresAt.toISOString(),
  ]);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await run("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
  }
  jar.delete(SESSION_COOKIE);
}

/** Devuelve el admin de la sesión actual, o null si no hay sesión válida. */
export async function currentUser(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await one<{
    id: number;
    username: string;
    role: "super" | "empresa";
    company_id: number | null;
    company_name: string | null;
    notifications_read_at: string | null;
  }>(
    `SELECT u.id, u.username, u.role, u.company_id, c.name AS company_name, u.notifications_read_at
     FROM sessions s
     JOIN admin_users u ON u.id = s.admin_user_id
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [hashToken(token), new Date().toISOString()]
  );

  return row;
}

export async function login(username: string, password: string): Promise<AdminUser | null> {
  const user = await one<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM admin_users WHERE username = ?",
    [username.trim().toLowerCase()]
  );
  if (!user || !(await verifyPassword(password, user.password_hash))) return null;

  await createSession(user.id);
  return currentUser();
}

export async function purgeExpiredSessions(): Promise<void> {
  await run("DELETE FROM sessions WHERE expires_at <= ?", [new Date().toISOString()]);
}

/** Los admins de empresa solo ven lo suyo: este helper evita repetir el filtro. */
export function companyScope(user: AdminUser): CompanyScope {
  return companyFilter(user.role, user.company_id);
}

export { all, one, run };
