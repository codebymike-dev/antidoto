import type { Metadata } from "next";
import { requireUser } from "@/lib/admin-guard";
import { PASSWORD_MIN } from "@/lib/admin-users";
import { colors, calSans } from "@/lib/theme";
import ChangePasswordForm from "@/components/admin/users/ChangePasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const user = await requireUser();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Mi cuenta</h1>
        <p style={{ fontSize: 14, color: colors.muted, margin: 0 }}>
          Entras como <b style={{ color: colors.ink }}>{user.username}</b>
          {user.role === "empresa" ? ` · admin de ${user.company_name}` : " · superadmin"}
        </p>
      </div>
      <h2 style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink, fontWeight: 400 }}>Cambiar contraseña</h2>
      <ChangePasswordForm username={user.username} minLength={PASSWORD_MIN} />
    </div>
  );
}
