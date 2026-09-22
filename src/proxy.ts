import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nonce por request: Next.js lo detecta automáticamente en el header
// Content-Security-Policy y lo aplica a los <script> que él mismo inyecta
// para la hidratación (no hay que tocar los componentes).
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://antidotocolombia.com;
    font-src 'self' https://cdn.jsdelivr.net;
    connect-src 'self' https://*.ably.net wss://*.ably.net https://*.ably-realtime.com wss://*.ably-realtime.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Todo menos assets estáticos y archivos con extensión (imágenes, fuentes, etc.).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
