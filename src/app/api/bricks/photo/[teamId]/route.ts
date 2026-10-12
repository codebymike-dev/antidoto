import { currentUser } from "@/lib/auth";
import { teamPhoto } from "@/lib/brick-gallery";
import { brickPlayerId } from "@/lib/brick-http";
import { matchIdParam } from "@/lib/live-http";

// Foto de la obra de un equipo. No es pública: ver quién puede en teamPhoto. `?descargar` la baja
// como archivo.
export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const teamId = matchIdParam((await params).teamId);
  const image = teamId ? await teamPhoto(teamId, { playerId: await brickPlayerId(), user: await currentUser() }) : null;
  if (!image) return new Response("No encontrado", { status: 404 });
  const ext = image.mime === "image/webp" ? "webp" : "jpg";
  const download = new URL(request.url).searchParams.has("descargar");
  const file = `obra-${image.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;
  return new Response(new Blob([image.body as Uint8Array<ArrayBuffer>], { type: image.mime }), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, no-cache",
      ...(download ? { "Content-Disposition": `attachment; filename="${file}"` } : {}),
    },
  });
}
