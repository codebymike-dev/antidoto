import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listBuildLibrary } from "@/lib/build-data";
import { getBuild, KIND_LABEL } from "@/lib/bricks/challenges";
import { colors, calSans } from "@/lib/theme";
import { card, filledButton, secondaryButton } from "@/lib/styles";
import { ArrowRightIcon } from "@/components/icons";
import BuildThumb from "@/components/bricks/BuildThumb";
import BuildTextsEditor from "@/components/admin/BuildTextsEditor";
import { cardStats, statLink, tagChip } from "@/components/admin/LibraryCard";

export const dynamic = "force-dynamic";

function formatTime(seconds: number | null): string {
  if (!seconds) return "Sin reloj";
  return seconds < 120 ? `${seconds} segundos` : `${Math.round(seconds / 60)} minutos`;
}

/** Un reto de construcción: cómo funciona, sus textos (editables por el superadmin) y su uso. */
export default async function RetoPage({ params }: { params: Promise<{ key: string }> }) {
  const user = (await currentUser())!;
  const isSuper = user.role === "super";
  const { key } = await params;
  const def = getBuild(key);
  if (!def) notFound();
  const item = (await listBuildLibrary(user)).find((i) => i.def.key === def.key)!;
  const { texts } = item;
  const people = item.participantes === 1 ? "1 participante" : `${item.participantes} participantes`;

  const rules = [
    { label: "Tipo", value: KIND_LABEL[def.kind] },
    { label: "Reloj", value: formatTime(def.timeLimit) },
    { label: "Piezas", value: def.maxPieces ? `Máximo ${def.maxPieces}` : "Sin límite" },
    { label: "Al entregar", value: def.story ? "Foto, título y frase" : "Foto de la obra" },
    ...(def.model ? [{ label: "Modelo", value: `${def.model.pieces.length} piezas para copiar` }] : []),
  ];

  return (
    <div>
      <Link href="/admin/biblioteca?tipo=construccion" style={{ fontSize: 13, color: colors.accentDark, fontWeight: 600 }}>
        ‹ Biblioteca
      </Link>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", margin: "14px 0 22px" }}>
        <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={tagChip}>{def.tag}</span>
          <h1 style={{ ...calSans, fontSize: 28, margin: 0, color: colors.ink }}>{texts.title}</h1>
          <p style={{ fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5 }}>{def.description}</p>
          <div style={{ ...cardStats, fontSize: 13 }}>
            <span>Construcción 3D</span>
            <span>{def.minutes}</span>
            {item.missionId ? (
              <Link href={`/admin/actividades/${item.missionId}`} className="btn-text" title="Ver resultados y obras" style={statLink}>
                {item.obras === 1 ? "1 obra" : `${item.obras} obras`} · {people}
                <ArrowRightIcon />
              </Link>
            ) : (
              <span>{people}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/admin/escena/construir?reto=${def.key}`} className="btn-secondary" style={{ ...secondaryButton, display: "inline-flex", alignItems: "center" }}>
            Probar el reto
          </Link>
          {isSuper && (
            <Link href={`/admin/asignar?actividad=${def.key}`} className="btn-filled" style={{ ...filledButton, display: "inline-flex", alignItems: "center" }}>
              Asignar a una empresa
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, alignItems: "start" }}>
        <section style={{ ...card, padding: 0, overflow: "hidden" }} aria-label="Cómo funciona">
          <BuildThumb kind={def.kind} label={`Ladrillos de ${texts.title}`} />
          <dl style={{ margin: 0, padding: 18, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: 13.5 }}>
            {rules.map((r) => (
              <div key={r.label} style={{ display: "contents" }}>
                <dt style={{ color: colors.muted }}>{r.label}</dt>
                <dd style={{ margin: 0, color: colors.ink, fontWeight: 600 }}>{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section style={{ ...card, padding: 20 }} aria-labelledby="reto-textos">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <h2 id="reto-textos" style={{ ...calSans, fontSize: 18, margin: 0, color: colors.ink }}>
              {isSuper ? "Textos del reto" : "Lo que lee el participante"}
            </h2>
            {item.edited && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#FFF3D6", color: "#A66B00" }}>Editado</span>
            )}
          </div>
          {isSuper ? (
            <>
              <p style={{ fontSize: 13, color: colors.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
                El reloj, el límite de piezas y el modelo son parte del reto y no se cambian aquí. Lo que edites lo ven de inmediato los
                participantes que todavía no han empezado.
              </p>
              <BuildTextsEditor build={def.key} texts={texts} edited={item.edited} />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: colors.inkSoft, lineHeight: 1.55 }}>
              <p style={{ margin: 0, fontWeight: 600, color: colors.ink }}>{texts.prompt}</p>
              {texts.reflection && (
                <p style={{ margin: 0 }}>
                  <b>Para pensar al cierre:</b> {texts.reflection}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
