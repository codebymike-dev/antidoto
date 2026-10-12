import { hostSnapshot } from "@/lib/brick-session";
import { hostGallery } from "@/lib/brick-gallery";
import { fail, json, matchIdParam, requireHost } from "@/lib/live-http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireHost(request);
  if (user instanceof Response) return user;
  const id = matchIdParam((await params).id);
  if (!id) return fail("Sesión no válida.", 404);
  const res = await hostSnapshot(id, user);
  if (!res.ok) return fail(res.error, res.status);
  return json({ session: res.session, teams: res.teams, ablyMessages: res.ablyMessages, gallery: await hostGallery(id, res.teams) });
}
