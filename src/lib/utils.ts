import { Group, Mission } from "./types";

export function nowStr(): string {
  return new Date().toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function validateCode(missions: Mission[], codeRaw: string): { mission: Mission; group: Group } | null {
  const code = codeRaw.trim().toUpperCase();
  for (const m of missions) {
    const g = m.groups.find((gr) => gr.codigo.toUpperCase() === code);
    if (g) return { mission: m, group: g };
  }
  return null;
}

export function computeStats(groups: Group[]) {
  const groupsCount = groups.length;
  const totalParticipantes = groups.reduce((a, g) => a + g.participantes, 0);
  const avgAvance = groupsCount ? Math.round(groups.reduce((a, g) => a + g.avance, 0) / groupsCount) : 0;
  return { groupsCount, totalParticipantes, avgAvance };
}

export function makeParticipantsPreview(g: Group) {
  if (!g.participantes) return [];
  const n = Math.min(3, g.participantes);
  const deltas = [9, 0, -11];
  const scoreDeltas = [0.4, 0, -0.5];
  return Array.from({ length: n }, (_, i) => ({
    nombre: `Participante ${i + 1}`,
    avance: Math.max(0, Math.min(100, g.avance + deltas[i])),
    puntaje: Math.max(0, Math.min(10, g.promedio + scoreDeltas[i])).toFixed(1),
  }));
}

export function exportCSVRows(title: string, rows: Group[]) {
  const header = ["Empresa", "Codigo", "Participantes", "Avance %", "Promedio", "Estado", "Expira"];
  const lines = [header.join(",")].concat(
    rows.map((g) => [g.empresa, g.codigo, g.participantes, g.avance, g.promedio, g.estado, g.expira].join(","))
  );
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function trendToPoints(trend: number[]): string {
  return trend
    .map((v, i) => `${(i * (140 / Math.max(1, trend.length - 1))).toFixed(1)},${(36 - (v / 100) * 32).toFixed(1)}`)
    .join(" ");
}

export function generateCodigo(missionTitle: string, empresa: string): string {
  const slug = empresa.split(/\s+/)[0].toUpperCase().slice(0, 6);
  const rand = Math.floor(10 + Math.random() * 89);
  const prefix = missionTitle.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  return `${prefix}-${slug}${rand}`;
}

export function formatFechaHoy(): string {
  return new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatExpira(dateStr: string): string {
  if (!dateStr) return "Sin definir";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}
