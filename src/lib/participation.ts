import "server-only";
import { cookies } from "next/headers";
import { one } from "./db";
import type { Estado } from "./types";
import { isExpired } from "./expiry";

export const PARTICIPATION_COOKIE = "antidoto_participacion";

export interface ParticipationView {
  id: string;
  participant_name: string;
  avance: number;
  completed_at: string | null;
  codigo: string;
  estado: Estado;
  empresa: string;
  company_id: number;
  mission_id: string;
  mission_tag: string;
  mission_title: string;
  mission_description: string;
  participantes: number;
  company_avance: number;
}

/** Lee la participación activa desde la cookie. Null si no hay o ya no existe. */
export async function currentParticipation(): Promise<ParticipationView | null> {
  const jar = await cookies();
  const id = jar.get(PARTICIPATION_COOKIE)?.value;
  if (!id) return null;

  const row = await one<Omit<ParticipationView, "estado"> & { estado: string; expira: string | null }>(
    `SELECT p.id, p.participant_name, p.avance, p.completed_at,
            ac.code AS codigo, ac.estado, ac.expires_at AS expira,
            c.name AS empresa, ac.company_id, m.id AS mission_id, m.tag AS mission_tag, m.title AS mission_title,
            m.description AS mission_description,
            (SELECT COUNT(*) FROM participations WHERE activity_code_id = ac.id) AS participantes,
            (SELECT CAST(COALESCE(AVG(avance), 0) AS INTEGER) FROM participations
              WHERE activity_code_id = ac.id) AS company_avance
     FROM participations p
     JOIN activity_codes ac ON ac.id = p.activity_code_id
     JOIN companies c ON c.id = ac.company_id
     JOIN missions m ON m.id = ac.mission_id
     WHERE p.id = ?`,
    [id]
  );
  if (!row) return null;

  const vencido = isExpired(row.expira);
  return {
    ...row,
    company_id: Number(row.company_id),
    participantes: Number(row.participantes),
    company_avance: Number(row.company_avance),
    avance: Number(row.avance),
    estado: vencido ? "vencido" : row.estado === "pausado" ? "pausado" : "activo",
  };
}
