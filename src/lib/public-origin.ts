import { headers } from "next/headers";

/** Dominio público de la app: los enlaces y QR que se comparten salen siempre con este. */
export const SITE_URL = "https://actividades.antidotocolombia.com";

/**
 * Host y origen para armar enlaces de invitación. En producción se usa el dominio propio
 * aunque el admin haya entrado por el *.vercel.app; en local y en previews, el de la petición
 * (así el enlace abre el mismo despliegue que se está probando).
 */
export async function publicOrigin(): Promise<{ host: string; origin: string }> {
  if (process.env.VERCEL_ENV === "production") {
    return { host: new URL(SITE_URL).host, origin: SITE_URL };
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { host, origin: `${proto}://${host}` };
}
