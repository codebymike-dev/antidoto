// Crea el juego "Acertijos de la Semana de la Salud" para Juan Valdez Café.
// Idempotente: si la empresa no existe la crea, y si el juego ya existe no hace nada.
// Uso: node --env-file=.env.local scripts/seed-juan-valdez-salud.mjs
import { createClient } from "@libsql/client/web";

const COMPANY = "Juan Valdez Café";
const TITLE = "Acertijos de la Semana de la Salud";
const DESCRIPTION =
  "Adivina qué hábito, órgano o alimento se esconde en cada acertijo y demuestra cuánto sabes de bienestar.";

// `correct` es el índice de la opción correcta; va variando para que la respuesta
// no caiga siempre en el mismo botón.
const QUESTIONS = [
  { prompt: "No tengo color, sabor ni olor, pero tu cuerpo es casi 60% de mí. ¿Qué soy?", options: ["Café", "Agua", "Aromática", "Jugo de lulo"], correct: 1 },
  { prompt: "Me frotas mínimo 20 segundos con agua y jabón, y así los gérmenes se van. ¿Qué somos?", options: ["Los pies", "Los dientes", "Las orejas", "Las manos"], correct: 3 },
  { prompt: "Tengo cerdas pero no vivo en la finca; me usas después de cada comida y tu sonrisa me lo agradece. ¿Qué soy?", options: ["El cepillo de dientes", "La escoba", "El peine", "La esponja"], correct: 0 },
  { prompt: "Duro cinco minutos, estiro cuello, espalda y manos, y te recargo sin salir de la oficina. ¿Qué soy?", options: ["La hora de almuerzo", "Las vacaciones", "La pausa activa", "La reunión"], correct: 2 },
  { prompt: "Entro por la nariz y salgo despacio por la boca; si me haces profunda, el estrés se aleja. ¿Qué soy?", options: ["El bostezo", "La respiración", "El suspiro de amor", "El estornudo"], correct: 1 },
  { prompt: "Miro pantallas todo el día; cada 20 minutos te pido mirar lejos por 20 segundos. ¿Quién soy?", options: ["Tus oídos", "Tu cuello", "Tus manos", "Tus ojos"], correct: 3 },
  { prompt: "Trabajo día y noche sin descansar; si caminas y comes bien, me cuidas por muchos años. ¿Quién soy?", options: ["Los pulmones", "El corazón", "El hígado", "El estómago"], correct: 1 },
  { prompt: "Si me pones a trabajar crezco fuerte; si me olvidas en el sofá, me encojo. ¿Qué soy?", options: ["El hueso", "La uña", "El músculo", "El cabello"], correct: 2 },
  { prompt: "Soy blanca y dulce, me escondo en gaseosas y postres, y la OMS pide que sea menos del 10% de tu dieta. ¿Qué soy?", options: ["El azúcar", "La sal", "La harina", "La leche"], correct: 0 },
  { prompt: "Soy blanca y salada; si pasas de 5 gramos de mí al día, tu presión arterial sube. ¿Qué soy?", options: ["El azúcar", "El arroz", "La panela", "La sal"], correct: 3 },
  { prompt: "Somos 150 y la OMS nos pide cada semana para que muevas el cuerpo. ¿Qué somos?", options: ["Pasos al día", "Minutos de actividad física", "Vasos de agua", "Horas de sueño"], correct: 1 },
  { prompt: "Soy verde, roja, amarilla y morada; vengo de la tierra y la OMS pide 400 gramos de mí al día. ¿Qué soy?", options: ["Granos de café", "Carnes", "Frutas y verduras", "Harinas"], correct: 2 },
  { prompt: "Soy el aroma de tus mañanas en Colombia, pero si me tomas muy tarde en la noche te robo algo valioso. ¿Qué te robo?", options: ["El apetito", "La memoria", "La paciencia", "El sueño"], correct: 3 },
  { prompt: "Nazco roja en las montañas de Colombia y guardo dos semillas que despiertan al país. ¿Qué soy?", options: ["La uchuva", "La cereza del café", "La guayaba", "La pitahaya"], correct: 1 },
];

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error("Falta TURSO_DATABASE_URL");
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

await db.execute({ sql: "INSERT OR IGNORE INTO companies (name) VALUES (?)", args: [COMPANY] });
const company = (await db.execute({ sql: "SELECT id FROM companies WHERE name = ?", args: [COMPANY] })).rows[0];
const companyId = Number(company.id);

const existing = await db.execute({
  sql: "SELECT id FROM live_games WHERE title = ? AND company_id = ? AND archived_at IS NULL",
  args: [TITLE, companyId],
});
if (existing.rows.length > 0) {
  console.log(`El juego ya existe (#${existing.rows[0].id}). No se hizo nada.`);
  process.exit(0);
}

const tx = await db.transaction("write");
try {
  const game = await tx.execute({
    sql: "INSERT INTO live_games (title, description, company_id) VALUES (?, ?, ?)",
    args: [TITLE, DESCRIPTION, companyId],
  });
  const gameId = Number(game.lastInsertRowid);
  for (const [qi, q] of QUESTIONS.entries()) {
    const inserted = await tx.execute({
      sql: "INSERT INTO live_questions (game_id, position, type, prompt, time_limit) VALUES (?, ?, 'quiz', ?, 30)",
      args: [gameId, qi + 1, q.prompt],
    });
    const questionId = Number(inserted.lastInsertRowid);
    for (const [oi, text] of q.options.entries()) {
      await tx.execute({
        sql: "INSERT INTO live_options (question_id, position, text, is_correct) VALUES (?, ?, ?, ?)",
        args: [questionId, oi + 1, text, oi === q.correct ? 1 : 0],
      });
    }
  }
  await tx.commit();
  console.log(`Juego #${gameId} creado para ${COMPANY} (empresa #${companyId}) con ${QUESTIONS.length} acertijos.`);
} finally {
  tx.close();
}
