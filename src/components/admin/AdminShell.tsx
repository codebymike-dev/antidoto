"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { colors, LOGO_SRC } from "@/lib/theme";
import { GridIcon, GearIcon, LogoutIcon, PlayIcon } from "@/components/icons";
import NotificationsBell from "./NotificationsBell";

interface Props {
  roleTitle: string;
  roleSubtitle: string;
  notifications: { id: number; text: string; time: string; read: boolean }[];
  children: React.ReactNode;
}

export default function AdminShell({ roleTitle, roleSubtitle, notifications, children }: Props) {
  const pathname = usePathname();
  const navConfigOn = pathname.startsWith("/admin/config");
  const navGamesOn = pathname.startsWith("/admin/juegos");
  const navActivitiesOn = !navConfigOn && !navGamesOn;
  const roleInitial = roleSubtitle === "Acceso total" ? "S" : roleSubtitle.charAt(0).toUpperCase();

  function navStyle(active: boolean) {
    return {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "11px 14px",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600 as const,
      color: active ? colors.ink : "#9FB8C2",
      background: active ? colors.accentLight : "transparent",
    };
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7FAFB" }}>
      <nav
        style={{
          width: 250,
          flexShrink: 0,
          background: colors.ink,
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
          gap: 26,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="Antídoto" style={{ height: 36, width: "fit-content" }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 10,
              borderRadius: 12,
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: colors.buttonGradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {roleInitial}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fff" }}>{roleTitle}</span>
              <span
                style={{
                  fontSize: 11,
                  color: "#7C93A0",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {roleSubtitle}
              </span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: colors.muted,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              padding: "0 10px",
              marginBottom: 2,
            }}
          >
            Menú
          </span>
          <Link
            href="/admin"
            className={navActivitiesOn ? "btn-navlink-active" : "btn-navlink"}
            style={navStyle(navActivitiesOn)}
          >
            <GridIcon />
            Actividades
          </Link>
          <Link
            href="/admin/juegos"
            className={navGamesOn ? "btn-navlink-active" : "btn-navlink"}
            style={navStyle(navGamesOn)}
          >
            <PlayIcon />
            Juegos en vivo
          </Link>
          <Link
            href="/admin/config"
            className={navConfigOn ? "btn-navlink-active" : "btn-navlink"}
            style={navStyle(navConfigOn)}
          >
            <GearIcon />
            Configuración
          </Link>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          <form action={logoutAction}>
            <button
              type="submit"
              className="btn-navlink"
              style={{ ...navStyle(false), border: "none", cursor: "pointer", width: "100%" }}
            >
              <LogoutIcon />
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <div style={{ flex: 1, padding: "36px 40px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginBottom: 24 }}>
          <NotificationsBell notifications={notifications} />
        </div>
        {children}
      </div>
    </div>
  );
}
