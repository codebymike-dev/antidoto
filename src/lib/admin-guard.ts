import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { run } from "./db";
import { currentUser, type AdminUser } from "./auth";

// Helpers de las Server Actions del admin. Viven fuera de los archivos "use server"
// a propósito: todo lo que se exporta desde ahí queda invocable desde el navegador.

export async function requireUser(): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Para lo que solo ve el superadmin: a un admin de empresa le responde 404, no 403. */
export async function requireSuper(): Promise<AdminUser> {
  const user = await requireUser();
  if (user.role !== "super") notFound();
  return user;
}

export async function audit(text: string, user: AdminUser | null, companyId: number | null = null) {
  await run("INSERT INTO audit_log (text, admin_user_id, company_id) VALUES (?, ?, ?)", [
    text,
    user?.id ?? null,
    companyId,
  ]);
}

/** Enlace al login del portal, para el mensaje con el acceso de alguien nuevo. */
export async function portalLoginUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}/admin/login`;
}
