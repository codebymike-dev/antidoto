import type { Metadata } from "next";
import { requireSuper } from "@/lib/admin-guard";
import DocsNav from "@/components/admin/docs/DocsNav";

export const metadata: Metadata = {
  title: "Documentación",
};

// Cada página vuelve a llamar a requireSuper: el layout no se re-renderiza al
// navegar entre páginas hermanas, así que no basta como única barrera.
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  await requireSuper();

  return (
    <div>
      <DocsNav />
      {children}
    </div>
  );
}
