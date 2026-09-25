/** Aviso verde de "listo" tras guardar algo. */
export default function SavedToast({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="toast-in"
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "#EAF7EE", color: "#1E6B3A", fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}
    >
      <span aria-hidden style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 999, background: "#2E9B57", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
        ✓
      </span>
      <span>{children}</span>
    </div>
  );
}
