"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { colors, LOGO_SRC } from "@/lib/theme";
import { BuildingIcon, DocIcon, GearIcon, HomeIcon, KeyIcon, LibraryIcon, LogoutIcon, PlayIcon } from "@/components/icons";
import NavPill from "@/components/motion/NavPill";
import NotificationsBell from "./NotificationsBell";
import Toaster from "./Toaster";

interface Props {
  roleTitle: string;
  roleSubtitle: string;
  /** La documentación de ingeniería solo la ve el superadmin. */
  showDocs: boolean;
  /** Admin de empresa: su menú empieza en la página de su empresa. */
  ownCompanyId: number | null;
  notifications: { id: number; text: string; time: string; read: boolean }[];
  children: React.ReactNode;
}

export default function AdminShell({ roleTitle, roleSubtitle, showDocs, ownCompanyId, notifications, children }: Props) {
  const pathname = usePathname();
  const isEmpresa = ownCompanyId !== null;
  const navGamesOn = pathname.startsWith("/admin/juegos");
  const navDocsOn = pathname.startsWith("/admin/docs");
  const navSettingsOn = pathname.startsWith("/admin/ajustes");
  const navAccountOn = pathname.startsWith("/admin/cuenta");
  // Los resultados de una actividad en todas las empresas se abren desde la biblioteca.
  const navLibraryOn =
    pathname.startsWith("/admin/biblioteca") || (!isEmpresa && pathname.startsWith("/admin/actividades"));
  const navCompaniesOn =
    pathname.startsWith("/admin/empresas") || pathname.startsWith("/admin/asignar") || (isEmpresa && pathname.startsWith("/admin/actividades"));
  const navHomeOn = !navGamesOn && !navDocsOn && !navSettingsOn && !navLibraryOn && !navCompaniesOn && !navAccountOn;
  const roleInitial = roleSubtitle === "Acceso total" ? "S" : roleSubtitle.charAt(0).toUpperCase();
  // En pantallas angostas el menú es un cajón (ver .admin-nav en globals.css).
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    // Al abrir, el foco entra al cajón; Escape lo cierra y devuelve el foco al botón.
    navRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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
    <div className="admin-shell" style={{ background: "#F7FAFB" }}>
      {menuOpen && <div className="admin-nav-backdrop" aria-hidden onClick={() => setMenuOpen(false)} />}
      <nav
        id="admin-nav"
        ref={navRef}
        aria-label="Menú del portal"
        className={menuOpen ? "admin-nav is-open" : "admin-nav"}
        style={{ background: colors.ink }}
        // Tocar un enlace del cajón lo cierra: la página nueva queda a la vista.
        onClick={(e) => (e.target as HTMLElement).closest("a") && setMenuOpen(false)}
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

        <NavPill activeKey={pathname}>
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
          {isEmpresa ? (
            <Link
              href={`/admin/empresas/${ownCompanyId}`}
              className={navCompaniesOn || navHomeOn ? "btn-navlink-active" : "btn-navlink"}
              style={navStyle(navCompaniesOn || navHomeOn)}
            >
              <BuildingIcon />
              Mi empresa
            </Link>
          ) : (
            <>
              <Link href="/admin" className={navHomeOn ? "btn-navlink-active" : "btn-navlink"} style={navStyle(navHomeOn)}>
                <HomeIcon />
                Inicio
              </Link>
              <Link
                href="/admin/empresas"
                className={navCompaniesOn ? "btn-navlink-active" : "btn-navlink"}
                style={navStyle(navCompaniesOn)}
              >
                <BuildingIcon />
                Empresas
              </Link>
            </>
          )}
          <Link
            href="/admin/biblioteca"
            className={navLibraryOn ? "btn-navlink-active" : "btn-navlink"}
            style={navStyle(navLibraryOn)}
          >
            <LibraryIcon />
            Biblioteca
          </Link>
          <Link
            href="/admin/juegos"
            className={navGamesOn ? "btn-navlink-active" : "btn-navlink"}
            style={navStyle(navGamesOn)}
          >
            <PlayIcon />
            Juegos en vivo
          </Link>
          {!isEmpresa && (
            <Link
              href="/admin/ajustes"
              className={navSettingsOn ? "btn-navlink-active" : "btn-navlink"}
              style={navStyle(navSettingsOn)}
            >
              <GearIcon />
              Ajustes
            </Link>
          )}
          {showDocs && (
            <Link
              href="/admin/docs"
              className={navDocsOn ? "btn-navlink-active" : "btn-navlink"}
              style={navStyle(navDocsOn)}
            >
              <DocIcon />
              Documentación
            </Link>
          )}
        </NavPill>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          <Link href="/admin/cuenta" className={navAccountOn ? "btn-navlink-active" : "btn-navlink"} style={navStyle(navAccountOn)}>
            <KeyIcon />
            Mi cuenta
          </Link>
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

      <main className="admin-main">
        <div className="admin-topbar">
          {/* Solo en pantallas angostas: abre el menú y muestra la marca, que ya no está a la izquierda. */}
          <button
            ref={menuButton}
            type="button"
            className="admin-menu-button"
            aria-expanded={menuOpen}
            aria-controls="admin-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span aria-hidden className="admin-menu-icon" />
            Menú
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="Antídoto" className="admin-topbar-logo" />
          <NotificationsBell notifications={notifications} />
        </div>
        {children}
      </main>
      {/* useSearchParams pide un Suspense alrededor. */}
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </div>
  );
}
