import { NextResponse } from "next/server";
import { currentUser, type AdminUser } from "@/lib/auth";
import { getCompany, getMission, listGroups } from "@/lib/queries";
import { csvCell } from "@/lib/live-report-format";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { id } = await params;
  const mission = await getMission(id);
  if (!mission) return new NextResponse("Actividad no encontrada", { status: 404 });

  const url = new URL(request.url);
  // Con ?empresa= se exporta solo esa empresa, como la ve su admin.
  const empresa = Number(url.searchParams.get("empresa"));
  let viewer: AdminUser = user;
  if (Number.isInteger(empresa) && empresa > 0) {
    if (user.role === "empresa" && user.company_id !== empresa) return new NextResponse("Actividad no encontrada", { status: 404 });
    const company = await getCompany(empresa);
    if (!company) return new NextResponse("Empresa no encontrada", { status: 404 });
    viewer = { ...user, role: "empresa", company_id: company.id, company_name: company.name };
  }

  const allGroups = await listGroups(id, viewer);
  if (viewer.role === "empresa" && allGroups.length === 0) {
    return new NextResponse("Actividad no encontrada", { status: 404 });
  }

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
