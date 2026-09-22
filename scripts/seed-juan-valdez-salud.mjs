// Juego "Acertijos de la Semana de la Salud" para Juan Valdez Café.
// Idempotente: crea la empresa si falta y deja el juego con estas preguntas.
// - Si no existe, lo crea.
// - Si existe sin partidas, reemplaza sus preguntas.
// - Si ya tiene partidas (en vivo o desafíos), crea una versión nueva y archiva la
//   anterior: borrar sus preguntas borraría las respuestas de esos reportes.
// Uso: node --env-file=.env.local scripts/seed-juan-valdez-salud.mjs
import { createClient } from "@libsql/client/web";

const COMPANY = "Juan Valdez Café";
const TITLE = "Acertijos de la Semana de la Salud";
const DESCRIPTION =
  "Acertijos sobre prevención, salud mental, primeros auxilios y hábitos en el trabajo, con datos de la OMS. ¿Cuánto sabes de tu salud?";
const TIME_LIMIT = 30;

// `correct` es el índice de la opción correcta; va variando para que la respuesta
// no caiga siempre en el mismo botón. Datos: OMS (sal, lavado de manos, actividad
// física, hipertensión, burnout CIE-11, alcohol), AHA (RCP) y EFSA (cafeína).
const QUESTIONS = [
  { prompt: "La OMS pide menos de 5 g de mí al día, una cucharadita, porque en exceso elevo la presión arterial. ¿Qué soy?", options: ["El azúcar", "La sal", "La grasa saturada", "La cafeína"], correct: 1 },
  { prompt: "Bien hecho, duro de 40 a 60 segundos según la OMS y corto infecciones respiratorias y digestivas. ¿Qué soy?", options: ["El gel antibacterial", "El tapabocas", "El lavado de manos con jabón", "La ducha diaria"], correct: 2 },
  { prompt: "Mientras ocurro, el cerebro elimina desechos y fija lo aprendido; un adulto necesita de 7 a 9 horas de mí. ¿Qué soy?", options: ["La meditación", "El sueño nocturno", "El ayuno", "La desconexión digital"], correct: 1 },
  { prompt: "Nazco de pasar horas sentado frente al computador y la OMS me liga a enfermedad cardiovascular y diabetes. ¿Qué soy?", options: ["El estrés laboral", "La mala postura", "El sedentarismo", "La fatiga visual"], correct: 2 },
  { prompt: "Me llaman el asesino silencioso: casi nunca doy síntomas y solo me descubres con un tensiómetro. ¿Qué soy?", options: ["La diabetes tipo 2", "El colesterol alto", "La anemia", "La hipertensión arterial"], correct: 3 },
  { prompt: "Somos dos números y desde nosotros la OMS habla de presión alta en un adulto. ¿Cuáles somos?", options: ["140/90 mmHg", "120/80 mmHg", "130/70 mmHg", "160/100 mmHg"], correct: 0 },
  { prompt: "La OMS recomienda a los adultos de 150 a 300 minutos semanales de mí, a intensidad moderada. ¿Qué soy?", options: ["Los estiramientos", "La actividad física aeróbica", "El entrenamiento de fuerza", "La caminata después de comer"], correct: 1 },
  { prompt: "Cada 20 minutos frente a la pantalla, mira a 6 metros durante 20 segundos. ¿Qué previene esta regla?", options: ["La fatiga visual digital", "El dolor de cuello", "La miopía de nacimiento", "El insomnio"], correct: 0 },
  { prompt: "En la zona ecuatorial de Colombia mi índice llega a niveles extremos casi todo el año, aunque esté nublado. ¿Qué soy?", options: ["La radiación infrarroja", "La contaminación del aire", "La radiación ultravioleta", "La humedad relativa"], correct: 2 },
  { prompt: "La OMS me reconoce como fenómeno laboral: agotamiento, distancia mental del trabajo y menor eficacia. ¿Qué soy?", options: ["El síndrome de burnout", "La ansiedad generalizada", "La depresión mayor", "El estrés agudo"], correct: 0 },
  { prompt: "Mira 5 cosas, toca 4, escucha 3, huele 2 y saborea 1: esta técnica te ancla al presente cuando yo aparezco. ¿Qué soy?", options: ["El insomnio", "Un ataque de ansiedad", "Una migraña", "Un bajón de azúcar"], correct: 1 },
  { prompt: "Mi examen mide tu azúcar promedio de los últimos 2 a 3 meses y sirve para diagnosticar diabetes. ¿Cómo me llamo?", options: ["Glucosa en ayunas", "Perfil lipídico", "Hemoglobina glicosilada (HbA1c)", "Hemograma completo"], correct: 2 },
  { prompt: "Si alguien cae inconsciente y no respira, me haces en el centro del pecho a 100-120 por minuto. ¿Qué soy?", options: ["Respiración boca a boca", "Posición lateral de seguridad", "Maniobra de Heimlich", "Compresiones torácicas (RCP)"], correct: 3 },
  { prompt: "La OMS afirma que no existe un nivel de consumo mío que sea seguro para la salud. ¿Qué soy?", options: ["El café", "El alcohol", "Las bebidas energéticas", "El chocolate"], correct: 1 },
  { prompt: "Soy la cafeína diaria que la autoridad europea EFSA considera segura para un adulto sano: unas 4 tazas de café. ¿Cuánto soy?", options: ["100 mg", "250 mg", "400 mg", "1.000 mg"], correct: 2 },
];

// Mismos límites que el editor (src/lib/live-validation.ts).
for (const [i, q] of QUESTIONS.entries()) {
  if (q.prompt.length > 160) throw new Error(`Pregunta ${i + 1}: más de 160 caracteres.`);
  if (q.options.some((o) => o.length > 75)) throw new Error(`Pregunta ${i + 1}: opción de más de 75 caracteres.`);
}

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error("Falta TURSO_DATABASE_URL");
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

await db.execute({ sql: "INSERT OR IGNORE INTO companies (name) VALUES (?)", args: [COMPANY] });
const company = (await db.execute({ sql: "SELECT id FROM companies WHERE name = ?", args: [COMPANY] })).rows[0];
const companyId = Number(company.id);

const current = (
  await db.execute({
    sql: `SELECT g.id, (SELECT COUNT(*) FROM live_matches m WHERE m.game_id = g.id) AS matches
          FROM live_games g WHERE g.title = ? AND g.company_id = ? AND g.archived_at IS NULL
          ORDER BY g.id DESC LIMIT 1`,
    args: [TITLE, companyId],
  })
).rows[0];

if (current) {
  const prompts = (await db.execute({ sql: "SELECT prompt FROM live_questions WHERE game_id = ? ORDER BY position", args: [current.id] })).rows;
  if (prompts.length === QUESTIONS.length && prompts.every((r, i) => r.prompt === QUESTIONS[i].prompt)) {
    console.log(`El juego #${current.id} ya tiene estas preguntas. No se hizo nada.`);
    process.exit(0);
  }
}

async function writeQuestions(tx, gameId) {
  await tx.execute({ sql: "DELETE FROM live_questions WHERE game_id = ?", args: [gameId] });
  for (const [qi, q] of QUESTIONS.entries()) {
    const inserted = await tx.execute({
      sql: "INSERT INTO live_questions (game_id, position, type, prompt, time_limit) VALUES (?, ?, 'quiz', ?, ?)",
      args: [gameId, qi + 1, q.prompt, TIME_LIMIT],
    });
    const questionId = Number(inserted.lastInsertRowid);
    for (const [oi, text] of q.options.entries()) {
      await tx.execute({
        sql: "INSERT INTO live_options (question_id, position, text, is_correct) VALUES (?, ?, ?, ?)",
        args: [questionId, oi + 1, text, oi === q.correct ? 1 : 0],
      });
    }
  }
}

const tx = await db.transaction("write");
try {
  let gameId;
  let message;
  if (current && Number(current.matches) === 0) {
    gameId = Number(current.id);
    await tx.execute({
      sql: "UPDATE live_games SET description = ?, updated_at = datetime('now') WHERE id = ?",
      args: [DESCRIPTION, gameId],
    });
    message = `Juego #${gameId} actualizado`;
  } else {
    const game = await tx.execute({
      sql: "INSERT INTO live_games (title, description, company_id) VALUES (?, ?, ?)",
      args: [TITLE, DESCRIPTION, companyId],
    });
    gameId = Number(game.lastInsertRowid);
    if (current) {
      await tx.execute({
        sql: "UPDATE live_games SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
        args: [current.id],
      });
      message = `Juego #${gameId} creado; el #${current.id} tenía ${current.matches} partida(s) y quedó archivado con sus reportes`;
    } else {
      message = `Juego #${gameId} creado`;
    }
  }
  await writeQuestions(tx, gameId);
  await tx.commit();
  console.log(`${message} para ${COMPANY} (empresa #${companyId}) con ${QUESTIONS.length} acertijos.`);
} finally {
  tx.close();
}
