import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { hostSnapshot } from "@/lib/brick-session";
import HostShell from "@/components/bricks/team/HostShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Construcción en equipo",
  robots: { index: false, follow: false },
};

// Fuera del layout del portal a propósito: es la pantalla del proyector, sin menú lateral.
export default async function EquiposPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const res = await hostSnapshot(Number((await params).id), user);
  if (!res.ok) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return (
    <HostShell
      initial={{ session: res.session, teams: res.teams, ablyMessages: res.ablyMessages }}
      joinHost={host}
      joinUrl={`${proto}://${host}/construir?pin=${res.session.pin}`}
    />
  );
}
