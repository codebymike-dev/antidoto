import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listGames } from "@/lib/live-games";
import { archiveGame, createGame, duplicateGame, launchMatch, restoreGame } from "@/lib/live-games-actions";
import { canEditGame } from "@/lib/scope";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, tabButton, tabButtonActive } from "@/lib/styles";
import { ArrowRightIcon, CopyIcon, InboxIcon, PlayIcon, SearchIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function JuegosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archivados?: string; error?: string }>;
}) {
  const user = (await currentUser())!;
  const { q = "", archivados, error } = await searchParams;
  const archived = archivados === "1";
  const games = await listGames(user, archived, q);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ ...calSans, fontSize: 28, margin: "0 0 4px 0", color: colors.ink }}>Juegos en vivo</h1>
          <p style={{ fontSize: 14, color: colors.muted, margin: 0 }}>
            Sets de preguntas para jugar en tiempo real, con proyector y celulares.
          </p>
        </div>
        <form action={createGame}>
          <button type="submit" className="btn-filled" style={filledButton}>
            ＋ Nuevo juego
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" style={{ ...card, padding: "12px 16px", margin: "0 0 16px 0", color: colors.danger, fontSize: 13.5, boxShadow: "none", background: "#FCE4E1" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <form style={{ flex: "1 1 240px", maxWidth: 320 }}>
          {archived && <input type="hidden" name="archivados" value="1" />}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              borderRadius: 10,
              border: `1.5px solid ${colors.border}`,
              padding: "0 14px",
              background: "#fff",
            }}
          >
            <span style={{ color: colors.mutedLight, display: "flex" }}>
              <SearchIcon />
            </span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar juego..."
              aria-label="Buscar juego"
              style={{ border: "none", outline: "none", fontSize: 13.5, width: "100%", background: "none", color: colors.ink }}
            />
          </div>
        </form>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { label: "Activos", on: !archived, href: "/admin/juegos" },
            { label: "Archivados", on: archived, href: "/admin/juegos?archivados=1" },
          ].map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={t.on ? "btn-tab-active" : "btn-tab"}
              style={t.on ? tabButtonActive : tabButton}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {games.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 12,
            maxWidth: 380,
            margin: "48px auto",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: colors.accentTint,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.accent,
            }}
          >
            {archived ? <InboxIcon /> : <PlayIcon />}
          </div>
          <h2 style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink }}>
            {q ? "No hay juegos que coincidan" : archived ? "No hay juegos archivados" : "Aún no tienes juegos"}
          </h2>
          <p style={{ fontSize: 13.5, color: colors.muted, margin: 0, lineHeight: 1.5 }}>
            {q
              ? "Prueba con otro término de búsqueda."
              : archived
                ? "Los juegos que archives aparecen aquí y se pueden restaurar."
                : "Crea tu primer juego: quiz, verdadero o falso, encuestas y nube de palabras."}
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {games.map((g) => {
          const editable = canEditGame(user.role, user.company_id, g.company_id);
          return (
            <div key={g.id} className="mission-card-link" style={{ ...card, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <Link href={`/admin/juegos/${g.id}`} style={{ display: "flex", flexDirection: "column", gap: 10, color: "inherit" }}>
                <span
                  style={{
                    alignSelf: "flex-start",
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: colors.accentDark,
                    letterSpacing: 0.5,
                    background: colors.accentTint,
                    padding: "4px 10px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                  }}
                >
                  {g.company_id === null ? "Global" : g.company_name}
                </span>
                <h3 style={{ ...calSans, fontSize: 17, margin: 0, color: colors.ink }}>{g.title}</h3>
                {g.description && (
                  <p
                    style={{
                      fontSize: 13,
                      color: colors.muted,
                      margin: 0,
                      lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {g.description}
                  </p>
                )}
                <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: colors.muted }}>
                  <span>{g.questions === 1 ? "1 pregunta" : `${g.questions} preguntas`}</span>
                  <span>{g.matches === 1 ? "1 partida" : `${g.matches} partidas`}</span>
                </div>
              </Link>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  borderTop: `1px solid ${colors.accentTint}`,
                  paddingTop: 12,
                  marginTop: "auto",
                }}
              >
                <Link
                  href={`/admin/juegos/${g.id}`}
                  className="btn-text"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: colors.accent }}
                >
                  {editable && g.matches === 0 ? "Editar" : "Ver"}
                  <ArrowRightIcon />
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!archived && g.questions > 0 && (
                    <form action={launchMatch}>
                      <input type="hidden" name="id" value={g.id} />
                      <button type="submit" className="btn-filled" style={{ ...filledButton, height: 30, padding: "0 12px", fontSize: 12.5 }}>
                        ▸ Jugar
                      </button>
                    </form>
                  )}
                  {editable && (
                    <form action={archived ? restoreGame : archiveGame}>
                      <input type="hidden" name="id" value={g.id} />
                      <button
                        type="submit"
                        className="btn-text"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: colors.muted }}
                      >
                        {archived ? "Restaurar" : "Archivar"}
                      </button>
                    </form>
                  )}
                  <form action={duplicateGame}>
                    <input type="hidden" name="id" value={g.id} />
                    <button
                      type="submit"
                      className="btn-icon"
                      aria-label="Duplicar juego"
                      title="Duplicar juego"
                      style={iconButton}
                    >
                      <CopyIcon />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const iconButton = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: "none",
  cursor: "pointer",
  color: colors.muted,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
