import { readLogo } from "@/lib/company-brand";

// Logo de una empresa. Es público: lo ven los participantes, el proyector y los reportes.
// La URL lleva la versión del archivo (?v=), así que con la versión vigente se cachea para
// siempre; con otra (un logo reemplazado) se sirve el actual sin caché.
export async function GET(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const id = Number(companyId);
  if (!Number.isInteger(id) || id <= 0) return new Response("No encontrado", { status: 404 });

  const logo = await readLogo(id);
  if (!logo) return new Response("No encontrado", { status: 404 });

  const current = new URL(request.url).searchParams.get("v") === logo.version;
  return new Response(new Blob([logo.bytes as Uint8Array<ArrayBuffer>], { type: logo.mime }), {
    headers: {
      "Content-Type": logo.mime,
      "Cache-Control": current ? "public, max-age=31536000, immutable" : "no-cache",
      ETag: `"${logo.version}"`,
      // Si alguien abre un SVG directo en el navegador, no puede ejecutar nada.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
