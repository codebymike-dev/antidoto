export interface CompanyScope {
  clause: string;
  args: number[];
}

/**
 * Filtro SQL que limita cualquier consulta sobre activity_codes (alias `ac`) a la
 * empresa del admin. Un superadmin no recibe filtro (ve todo).
 */
export function companyFilter(role: "super" | "empresa", companyId: number | null): CompanyScope {
  return role === "empresa" ? { clause: "AND ac.company_id = ?", args: [companyId!] } : { clause: "", args: [] };
}
