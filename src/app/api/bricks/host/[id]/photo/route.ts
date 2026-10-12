import { saveTeamPhoto } from "@/lib/brick-gallery";
import { fail, json, matchIdParam, requireHost } from "@/lib/live-http";

/** El proyector sube la foto de la obra de un equipo (una por petición). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireHost(request);
  if (user instanceof Response) return user;
  const id = matchIdParam((await params).id);
  if (!id) return fail("Sesión no válida.", 404);
  const form = await request.formData().catch(() => null);
  const teamId = matchIdParam(String(form?.get("team") ?? ""));
  if (!form || !teamId) return fail("Falta el equipo.");
  const image = form.get("image");
  const res = await saveTeamPhoto(id, user, teamId, image instanceof Blob ? image : null);
  return res.ok ? json({ ok: true }) : fail(res.error, res.status);
}
