import { colors } from "@/lib/theme";
import { fieldLabel } from "@/lib/styles";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} style={fieldLabel}>
        {label}
      </label>
      {children}
      {error && (
        <span role="alert" style={{ fontSize: 12.5, color: colors.danger }}>
          {error}
        </span>
      )}
    </div>
  );
}

export const input: React.CSSProperties = {
  height: 44,
  borderRadius: 10,
  border: `1.5px solid ${colors.border}`,
  padding: "0 12px",
  fontSize: 14,
  color: colors.ink,
  background: "#fff",
  width: "100%",
};
