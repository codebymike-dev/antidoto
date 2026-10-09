import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth";
import { workImage } from "@/lib/build-data";
import { PARTICIPATION_COOKIE } from "@/lib/participation";

// Foto de una obra de construcción. No es pública: la ve quien la construyó (su cookie) y los
// admins con alcance sobre su empresa. `?descargar` la baja como archivo.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jar = await cookies();
  const image = await workImage(id, { participationId: jar.get(PARTICIPATION_COOKIE)?.value ?? null, user: await currentUser() });
  if (!image) return new Response("No encontrado", { status: 404 });

  const ext = image.mime === "image/webp" ? "webp" : "jpg";
  const download = new URL(request.url).searchParams.has("descargar");
  return new Response(new Blob([image.body as Uint8Array<ArrayBuffer>], { type: image.mime }), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, no-cache",
      ...(download ? { "Content-Disposition": `attachment; filename="mi-obra.${ext}"` } : {}),
    },
  });
}
