import "server-only";
import { all, one } from "./db";
import { logoUrl } from "./logo-file";
import type { PublicBrand } from "./brand-palette";

// Lectura de la marca de cada empresa (tabla company_branding). La escritura vive en
// brand-actions.ts. Nunca se selecciona la columna logo salvo en readLogo: pesa.

interface BrandRow {
  id: number;
  name: string;
  primary_color: string | null;
  secondary_color: string | null;
  welcome: string | null;
  logo_version: string | null;
  logo_surface: "claro" | "oscuro" | null;
}

const BRAND_COLUMNS = `c.id, c.name, b.primary_color, b.secondary_color, b.welcome, b.logo_version, b.logo_surface`;

function toBrand(row: BrandRow): PublicBrand | null {
  if (!row.primary_color) return null;
  return {
    companyId: Number(row.id),
    name: row.name,
    primary: row.primary_color,
    secondary: row.secondary_color,
    welcome: row.welcome,
    logoUrl: row.logo_version ? logoUrl(Number(row.id), row.logo_version) : null,
    logoSurface: row.logo_surface ?? "claro",
  };
}

/** Marca de la empresa, o null si no la ha configurado (se usa la de Antídoto). */
export async function getCompanyBrand(companyId: number | null): Promise<PublicBrand | null> {
  if (companyId === null) return null;
  const row = await one<BrandRow>(
    `SELECT ${BRAND_COLUMNS} FROM companies c LEFT JOIN company_branding b ON b.company_id = c.id WHERE c.id = ?`,
    [companyId]
  );
  return row ? toBrand(row) : null;
}

export interface CompanyListItem {
  id: number;
  name: string;
  codes: number;
  brand: PublicBrand | null;
}

export async function listCompaniesWithBrand(): Promise<CompanyListItem[]> {
  const rows = await all<BrandRow & { codes: number }>(
    `SELECT ${BRAND_COLUMNS}, (SELECT COUNT(*) FROM activity_codes ac WHERE ac.company_id = c.id) AS codes
     FROM companies c LEFT JOIN company_branding b ON b.company_id = c.id
     ORDER BY c.name COLLATE NOCASE`
  );
  return rows.map((r) => ({ id: Number(r.id), name: r.name, codes: Number(r.codes), brand: toBrand(r) }));
}

export async function getCompanyName(companyId: number): Promise<string | null> {
  const row = await one<{ name: string }>("SELECT name FROM companies WHERE id = ?", [companyId]);
  return row?.name ?? null;
}

export async function readLogo(companyId: number): Promise<{ bytes: Uint8Array; mime: string; version: string } | null> {
  const row = await one<{ logo: ArrayBuffer | null; logo_mime: string | null; logo_version: string | null }>(
    "SELECT logo, logo_mime, logo_version FROM company_branding WHERE company_id = ?",
    [companyId]
  );
  if (!row?.logo || !row.logo_mime || !row.logo_version) return null;
  return { bytes: new Uint8Array(row.logo), mime: row.logo_mime, version: row.logo_version };
}
