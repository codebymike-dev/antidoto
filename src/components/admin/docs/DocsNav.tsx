"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabButton, tabButtonActive } from "@/lib/styles";

export const DOCS_PAGINAS = [
  { href: "/admin/docs", label: "Resumen" },
  { href: "/admin/docs/requerimientos-funcionales", label: "Req. funcionales" },
  { href: "/admin/docs/requerimientos-no-funcionales", label: "Req. no funcionales" },
  { href: "/admin/docs/historias-de-usuario", label: "Historias de usuario" },
  { href: "/admin/docs/kanban", label: "Kanban" },
] as const;

export default function DocsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de la documentación" style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 24 }}>
      {DOCS_PAGINAS.map((p) => {
        const on = pathname === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={on ? "page" : undefined}
            className={on ? "btn-tab-active" : "btn-tab"}
            style={on ? tabButtonActive : tabButton}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
