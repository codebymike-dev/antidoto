import { galleryCommand } from "@/lib/brick-gallery";
import { fail, json, matchIdParam, readJson, requireHost } from "@/lib/live-http";

/** Abrir la votación o mostrar los resultados desde el proyector. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireHost(request);
  if (user instanceof Response) return user;
  const id = matchIdParam((await params).id);
  if (!id) return fail("Sesión no válida.", 404);
  const res = await galleryCommand(id, user, String((await readJson(request)).action ?? ""));
  return res.ok ? json({ ok: true }) : fail(res.error, res.status);
}
