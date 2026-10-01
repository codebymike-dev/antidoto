import Link from "next/link";
import type { PortalUser } from "@/lib/queries";
import { setPortalUserDisabled } from "@/lib/user-actions";
import { colors, calSans } from "@/lib/theme";
import { card, secondaryButton } from "@/lib/styles";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";
import NewUserForm from "./NewUserForm";
import ResetPasswordForm from "./ResetPasswordForm";

interface Props {
  title: string;
  intro: string;
  users: PortalUser[];
  /** null = superadmins. */
  companyId: number | null;
  currentUserId: number;
  loginUrl: string;
  /** Una empresa archivada no recibe accesos nuevos. */
  canCreate: boolean;
}

/** Quién entra al portal, con alta, nueva contraseña y desactivar. Solo para el superadmin. */
export default function PortalUsersPanel({ title, intro, users, companyId, currentUserId, loginUrl, canCreate }: Props) {
  const activeSupers = companyId === null ? users.filter((u) => !u.disabled).length : 0;

  return (
    <section style={{ ...card, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby={`usuarios-${companyId ?? "super"}`}>
      <div>
        <h2 id={`usuarios-${companyId ?? "super"}`} style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink, fontWeight: 400 }}>
          {title}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: colors.muted, lineHeight: 1.5 }}>{intro}</p>
      </div>

      {users.length === 0 ? (
        <div style={{ padding: "16px", borderRadius: 12, background: "#F7FBFC", fontSize: 13.5, color: colors.muted, textAlign: "center" }}>
          Nadie tiene acceso todavía.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {users.map((u) => {
            const isMe = u.id === currentUserId;
            // El último superadmin activo no se puede desactivar: el portal quedaría sin dueño.
            const lastSuper = companyId === null && !u.disabled && activeSupers <= 1;
            return (
              <li
                key={u.id}
                style={{ display: "flex", alignItems: "center", gap: "10px 18px", flexWrap: "wrap", padding: "12px 0", borderTop: `1px solid ${colors.accentTint}` }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: 8, flexShrink: 0, background: u.disabled ? colors.mutedLight : "#1F8A4C" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: u.disabled ? colors.muted : colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.username}
                  </span>
                  {isMe && <span style={{ fontSize: 12, color: colors.muted }}>(tú)</span>}
                  {u.disabled && (
                    <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 100, color: colors.muted, background: "#EEF3F5", whiteSpace: "nowrap" }}>
                      Desactivado
                    </span>
                  )}
                </div>

                {isMe ? (
                  <Link href="/admin/cuenta" style={{ fontSize: 12.5, fontWeight: 600, color: colors.accent }}>
                    Cambiar mi contraseña
                  </Link>
                ) : u.disabled ? (
                  <form action={setPortalUserDisabled}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="disabled" value="0" />
                    <button type="submit" className="btn-secondary" style={{ ...secondaryButton, height: 34 }}>
                      Reactivar
                    </button>
                  </form>
                ) : (
                  <>
                    <ResetPasswordForm userId={u.id} loginUrl={loginUrl} />
                    {!lastSuper && (
                      <form action={setPortalUserDisabled}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="disabled" value="1" />
                        <ConfirmDeleteButton confirmLabel="Sí, desactivar">Desactivar</ConfirmDeleteButton>
                      </form>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canCreate && (
        <div style={{ borderTop: `1px solid ${colors.accentTint}`, paddingTop: 14 }}>
          <NewUserForm companyId={companyId} loginUrl={loginUrl} />
        </div>
      )}
    </section>
  );
}
