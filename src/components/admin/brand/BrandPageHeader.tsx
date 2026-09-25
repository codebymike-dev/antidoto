import Link from "next/link";
import { colors, calSans } from "@/lib/theme";

export default function BrandPageHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle: string;
  back?: { href: string; label: string };
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      {back && (
        <Link href={back.href} style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
          ‹ {back.label}
        </Link>
      )}
      <h1 style={{ ...calSans, fontSize: 28, margin: "10px 0 6px", color: colors.ink, fontWeight: 400 }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, color: colors.muted, maxWidth: 620, lineHeight: 1.55 }}>{subtitle}</p>
    </div>
  );
}
