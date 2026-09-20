"use client";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "sans-serif",
          color: "#0F181D",
          textAlign: "center",
          padding: 20,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>No pudimos cargar Antídoto</h1>
        <p style={{ margin: 0, color: "#5C7680" }}>Ocurrió un error inesperado. Intenta de nuevo en unos minutos.</p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            height: 44,
            padding: "0 20px",
            borderRadius: 12,
            border: "none",
            background: "#1C99CA",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
