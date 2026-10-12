"use server";

import { redirect } from "next/navigation";
import { clearBrickPlayer } from "./brick-http";
import { requireUser } from "./admin-guard";
import { launchSession } from "./brick-session";

/** Salir de la sesión en equipo: el celular la olvida. Lo construido queda en la obra del equipo. */
export async function leaveBrickSession() {
  await clearBrickPlayer();
  redirect("/construir");
}

export type LaunchState = { error: string } | null;

/** Lanza una sesión en equipo desde la biblioteca y abre la pantalla del proyector. */
export async function launchTeamSession(_prev: LaunchState, formData: FormData): Promise<LaunchState> {
  const user = await requireUser();
  const res = await launchSession(user, {
    mode: String(formData.get("mode") ?? ""),
    teamSize: Number(formData.get("teamSize")),
    timeLimit: Number(formData.get("timeLimit")),
  });
  if (!res.ok) return { error: res.error };
  redirect(`/admin/equipos/${res.id}`);
}
