import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getMatchReport } from "@/lib/live-reports";
import { csvCell } from "@/lib/live-report-format";

const TYPE_NAMES = { quiz: "Quiz", vf: "Verdadero o falso", encuesta: "Encuesta", nube: "Nube de palabras" } as const;

/** Detalle completo: una fila por respuesta, más una por cada pregunta que el jugador no respondió. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; matchId: string }> }) {
  const user = await currentUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { id, matchId } = await params;
  const report = await getMatchReport(Number(id), Number(matchId), user);
  if (!report) return new NextResponse("Partida no encontrada", { status: 404 });

  const { match, questions, players, answers, ranking } = report;
  const rankOf = new Map(ranking.map((e) => [e.nickname, e.rank]));
  const played = questions.filter((q) => match.lastPosition !== null && q.position <= match.lastPosition);

  const header = [
    "Jugador",
    "Puesto final",
    "Expulsado",
    "Pregunta",
    "Tipo",
    "Enunciado",
    "Respuesta",
    "Correcta",
    "Tiempo (s)",
    "Puntos",
  ];
  const lines = [header.map(csvCell).join(",")];

  for (const p of players) {
    for (const q of played) {
      const a = answers.find((x) => x.nickname === p.nickname && x.position === q.position);
      const response = !a ? "" : a.text ?? (a.optionIndex !== null ? q.optionTexts[a.optionIndex] ?? "" : "");
      const correct = !a ? (q.type === "quiz" || q.type === "vf" ? "Sin responder" : "") : a.isCorrect === null ? "" : a.isCorrect ? "Sí" : "No";
      lines.push(
        [
          p.nickname,
          p.kicked ? "" : rankOf.get(p.nickname) ?? "",
          p.kicked ? "Sí" : "No",
          q.position,
          TYPE_NAMES[q.type],
          q.prompt,
          response,
          correct,
          a ? (a.responseMs / 1000).toFixed(2) : "",
          a ? a.points : 0,
        ]
          .map(csvCell)
          .join(",")
      );
    }
  }

  // BOM para que Excel abra bien los acentos.
  const csv = "﻿" + lines.join("\r\n");
  const date = (match.started_at ?? match.created_at).slice(0, 10);
  const filename = `${match.gameTitle.replace(/[^\p{L}\p{N}]+/gu, "_")}_${date}_partida${match.id}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
