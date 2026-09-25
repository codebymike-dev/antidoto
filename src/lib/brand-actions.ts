"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { InStatement } from "@libsql/client/web";
import { db, one } from "./db";
import { audit, requireUser } from "./admin-guard";
import { parseHex } from "./brand-palette";
import { checkLogo } from "./logo-file";

export type BrandFormState = { error: string; field?: "name" | "primary" | "secondary" | "welcome" | "logo" } | null;

const WELCOME_MAX = 140;
const NAME_MAX = 80;

/**
 * Crea una empresa con su marca o actualiza la de una existente. El superadmin puede
 * todo; el admin de empresa solo la marca de la suya (el id y el nombre del form se ignoran).
 */
export async function saveCompanyBrand(_prev: BrandFormState, formData: FormData): Promise<BrandFormState> {
  const user = await requireUser();
  const isSuper = user.role === "super";

  const rawId = String(formData.get("companyId") ?? "").trim();
  const companyId = isSuper ? (rawId ? Number(rawId) : null) : user.company_id;
  if (companyId !== null && (!Number.isInteger(companyId) || companyId <= 0)) return { error: "Empresa no válida." };

  const existing = companyId !== null ? await one<{ name: string }>("SELECT name FROM companies WHERE id = ?", [companyId]) : null;
  if (companyId !== null && !existing) return { error: "La empresa ya no existe." };

  const name = isSuper ? String(formData.get("name") ?? "").trim().replace(/\s+/g, " ") : existing!.name;
  if (!name) return { error: "Escribe el nombre de la empresa.", field: "name" };
  if (name.length > NAME_MAX) return { error: `El nombre admite hasta ${NAME_MAX} caracteres.`, field: "name" };
  const clash = await one<{ id: number }>("SELECT id FROM companies WHERE name = ? COLLATE NOCASE", [name]);
  if (clash && Number(clash.id) !== companyId) return { error: "Ya existe una empresa con ese nombre.", field: "name" };

  const primary = parseHex(String(formData.get("primary") ?? ""));
  if (!primary) return { error: "Elige un color principal válido (por ejemplo #1C99CA).", field: "primary" };
  const rawSecondary = String(formData.get("secondary") ?? "").trim();
  const secondary = rawSecondary ? parseHex(rawSecondary) : null;
  if (rawSecondary && !secondary) return { error: "El color secundario no es válido.", field: "secondary" };

  const welcome = String(formData.get("welcome") ?? "").trim().replace(/\s+/g, " ") || null;
  if (welcome && welcome.length > WELCOME_MAX) return { error: `El mensaje admite hasta ${WELCOME_MAX} caracteres.`, field: "welcome" };

  const surface = formData.get("logoSurface") === "oscuro" ? "oscuro" : "claro";
  const logoChange = String(formData.get("logoChange") ?? "keep");

  let logo: { bytes: Uint8Array; mime: string; version: string } | null = null;
  if (logoChange === "replace") {
    const file = formData.get("logo");
    if (!(file instanceof File)) return { error: "No llegó el archivo del logo. Vuelve a elegirlo.", field: "logo" };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkLogo(bytes);
    if (!check.ok) return { error: check.error, field: "logo" };
    logo = { bytes, mime: check.mime, version: createHash("sha256").update(bytes).digest("hex").slice(0, 12) };
  }

  // La marca se guarda junto con la empresa: una empresa nueva nunca queda a medias.
  const companyRef = companyId !== null ? "?" : "(SELECT id FROM companies WHERE name = ?)";
  const logoColumns = logo ? ", logo, logo_mime, logo_version" : logoChange === "remove" ? ", logo, logo_mime, logo_version" : "";
  const logoValues = logo || logoChange === "remove" ? ", ?, ?, ?" : "";
  const logoArgs = logo ? [logo.bytes, logo.mime, logo.version] : logoChange === "remove" ? [null, null, null] : [];
  const logoUpdate = logoColumns ? ", logo = excluded.logo, logo_mime = excluded.logo_mime, logo_version = excluded.logo_version" : "";

  const statements: InStatement[] = [];
  if (companyId === null) statements.push({ sql: "INSERT INTO companies (name) VALUES (?)", args: [name] });
  else if (isSuper && name !== existing!.name) statements.push({ sql: "UPDATE companies SET name = ? WHERE id = ?", args: [name, companyId] });
  statements.push({
    sql: `INSERT INTO company_branding (company_id, primary_color, secondary_color, welcome, logo_surface, updated_by, updated_at${logoColumns})
          VALUES (${companyRef}, ?, ?, ?, ?, ?, datetime('now')${logoValues})
          ON CONFLICT(company_id) DO UPDATE SET
            primary_color = excluded.primary_color, secondary_color = excluded.secondary_color,
            welcome = excluded.welcome, logo_surface = excluded.logo_surface,
            updated_by = excluded.updated_by, updated_at = excluded.updated_at${logoUpdate}`,
    args: [companyId ?? name, primary, secondary, welcome, surface, user.id, ...logoArgs],
  });

  try {
    await db().batch(statements, "write");
  } catch {
    // La causa más probable es el UNIQUE del nombre, si otro admin la creó al mismo tiempo.
    return { error: "No pudimos guardar. Revisa que el nombre no esté repetido e inténtalo de nuevo." };
  }

  const saved = await one<{ id: number }>("SELECT id FROM companies WHERE name = ?", [name]);
  const savedId = Number(saved!.id);
  if (companyId === null) await audit(`Empresa "${name}" creada con su marca.`, user, savedId);
  else if (name !== existing!.name) await audit(`Empresa "${existing!.name}" renombrada a "${name}" y marca actualizada.`, user, savedId);
  else await audit(`Marca de "${name}" actualizada.`, user, savedId);

  revalidatePath("/admin/config");
  redirect(isSuper ? `/admin/config?tab=companies&guardada=${savedId}` : "/admin/config?tab=marca&guardada=1");
}
