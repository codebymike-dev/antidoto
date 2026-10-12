import { hostCommand } from "@/lib/brick-session";
import { fail, json, matchIdParam, readJson, requireHost } from "@/lib/live-http";

/** Empezar, alargar un minuto o terminar la sesión desde el proyector. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireHost(request);
  if (user instanceof Response) return user;
  const id = matchIdParam((await params).id);
  if (!id) return fail("Sesión no válida.", 404);
  const res = await hostCommand(id, user, String((await readJson(request)).action ?? ""));
  return res.ok ? json({ ok: true }) : fail(res.error, res.status);
}
