import Link from "next/link";
import { colors, calSans } from "@/lib/theme";

export default function BrandPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <Link href="/admin/config?tab=companies" style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
        ‹ Empresas y grupos
      </Link>
      <h1 style={{ ...calSans, fontSize: 28, margin: "10px 0 6px", color: colors.ink, fontWeight: 400 }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, color: colors.muted, maxWidth: 620, lineHeight: 1.55 }}>{subtitle}</p>
    </div>
  );
}
