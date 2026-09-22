export interface CompanyScope {
  clause: string;
  args: number[];
}

type Role = "super" | "empresa";

/**
 * Filtro SQL que limita una consulta a la empresa del admin. Por defecto apunta a
 * activity_codes (alias `ac`); `column` permite usarlo sobre otras tablas, por
 * ejemplo `m.company_id` en live_matches. Un superadmin no recibe filtro (ve todo).
 */
export function companyFilter(role: Role, companyId: number | null, column = "ac.company_id"): CompanyScope {
  return role === "empresa" ? { clause: `AND ${column} = ?`, args: [companyId!] } : { clause: "", args: [] };
}

/**
 * Juegos en vivo que el admin puede ver y lanzar (alias `g`): los de su empresa
 * más los globales (company_id nulo).
 */
export function visibleGamesFilter(role: Role, companyId: number | null): CompanyScope {
  return role === "empresa"
    ? { clause: "AND (g.company_id = ? OR g.company_id IS NULL)", args: [companyId!] }
    : { clause: "", args: [] };
}

/** Editar o archivar un juego: los globales son solo del superadmin. */
export function canEditGame(role: Role, companyId: number | null, gameCompanyId: number | null): boolean {
  return role === "super" || (gameCompanyId !== null && gameCompanyId === companyId);
}
