import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getMission, listGroups } from "@/lib/queries";
import { csvCell } from "@/lib/live-report-format";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { id } = await params;
  const mission = await getMission(id);
  if (!mission) return new NextResponse("Actividad no encontrada", { status: 404 });

  const allGroups = await listGroups(id, user);
  if (user.role === "empresa" && allGroups.length === 0) {
    return new NextResponse("Actividad no encontrada", { status: 404 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const estado = url.searchParams.get("estado") ?? "todos";

  const groups = allGroups.filter(
    (g) =>
      (estado === "todos" || g.estado === estado) &&
      (!q.trim() || g.empresa.toLowerCase().includes(q.trim().toLowerCase()))
  );

  const header = ["Empresa", "Codigo", "Participantes", "Avance %", "Promedio", "Estado", "Expira"];
  const lines = [
    header.join(","),
    ...groups.map((g) =>
      [g.empresa, g.codigo, g.participantes, g.avance, g.promedio, g.estado, g.expira ?? "Sin definir"]
        .map(csvCell)
        .join(",")
    ),
  ];

  // BOM para que Excel abra bien los acentos.
  const csv = "﻿" + lines.join("\r\n");
  const filename = `${mission.title.replace(/[^\p{L}\p{N}]+/gu, "_")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // filename* admite tildes; con comillas o emoji en el título el header plano fallaba.
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
