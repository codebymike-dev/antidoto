import "server-only";
import { all, one } from "./db";
import type { AdminUser } from "./auth";
import { companyFilter } from "./scope";
import { loadQuestions, type FullQuestion } from "./live-match";
import { computeLeaderboard, questionStats, scored, type LeaderboardEntry, type QuestionStats } from "./live-engine";
import type { LiveMatchStatus } from "./types";
import { sqliteToMs } from "./live-challenge-engine";

// Reportes de partidas en vivo. Todo se calcula desde live_answers con el mismo motor
// que la partida: el reporte y lo que se vio en el proyector no pueden diferir.

export interface MatchSummary {
  id: number;
  pin: string;
  status: LiveMatchStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  host: string | null;
  players: number;
  answers: number;
  /** No nulo = desafío asíncrono, abierto hasta esta fecha (UTC, formato de SQLite). */
  closes_at: string | null;
}

export async function listMatches(gameId: number, user: AdminUser): Promise<MatchSummary[]> {
  const { clause, args } = companyFilter(user.role, user.company_id, "m.company_id");
  return all<MatchSummary>(
    `SELECT m.id, m.pin, m.status, m.created_at, m.started_at, m.finished_at, u.username AS host, c.closes_at,
            (SELECT COUNT(*) FROM live_players p WHERE p.match_id = m.id AND p.kicked_at IS NULL) AS players,
            (SELECT COUNT(*) FROM live_answers a JOIN live_players p ON p.id = a.player_id WHERE p.match_id = m.id) AS answers
     FROM live_matches m
     LEFT JOIN admin_users u ON u.id = m.host_user_id
     LEFT JOIN live_challenges c ON c.match_id = m.id
     WHERE m.game_id = ? ${clause}
     ORDER BY m.id DESC`,
    [gameId, ...args]
  );
}

export interface PlayerRow {
  nickname: string;
  kicked: boolean;
  joinedAt: string;
}

export interface AnswerRow {
  nickname: string;
  kicked: boolean;
  position: number;
  optionIndex: number | null;
  text: string | null;
  isCorrect: boolean | null;
  responseMs: number;
  points: number;
}

export interface MatchReport {
  match: MatchSummary & {
    gameId: number;
    gameTitle: string;
    lastPosition: number | null;
    /** Desafío que todavía se puede jugar (ni cerrado a mano ni vencido). */
    challengeOpen: boolean;
  };
  questions: (FullQuestion & { stats: QuestionStats; players: number })[];
  ranking: (LeaderboardEntry & { avgResponseMs: number | null })[];
  players: PlayerRow[];
  answers: AnswerRow[];
  /** Desafío: jugadores (no expulsados) que llegaron al final. 0 en vivo. */
  finished: number;
}

/** Reporte completo de una partida del juego, si el admin puede verla. */
export async function getMatchReport(gameId: number, matchId: number, user: AdminUser): Promise<MatchReport | null> {
  const { clause, args } = companyFilter(user.role, user.company_id, "m.company_id");
  const match = await one<MatchSummary & { game_id: number; game_title: string; current_position: number | null }>(
    `SELECT m.id, m.pin, m.status, m.created_at, m.started_at, m.finished_at, u.username AS host, c.closes_at,
            m.game_id, g.title AS game_title, m.current_position, 0 AS players, 0 AS answers
     FROM live_matches m
     JOIN live_games g ON g.id = m.game_id
     LEFT JOIN admin_users u ON u.id = m.host_user_id
     LEFT JOIN live_challenges c ON c.match_id = m.id
     WHERE m.id = ? AND m.game_id = ? ${clause}`,
    [matchId, gameId, ...args]
  );
  if (!match) return null;

  const [questions, playerRows, answerRows, finishedRow] = await Promise.all([
    loadQuestions(match.game_id),
    all<{ nickname: string; kicked_at: string | null; joined_at: string }>(
      "SELECT nickname, kicked_at, joined_at FROM live_players WHERE match_id = ? ORDER BY rowid",
      [match.id]
    ),
    all<{
      nickname: string;
      kicked_at: string | null;
      question_id: number;
      option_id: number | null;
      text: string | null;
      is_correct: number | null;
      response_ms: number;
      points: number;
    }>(
      `SELECT p.nickname, p.kicked_at, a.question_id, a.option_id, a.text, a.is_correct, a.response_ms, a.points
       FROM live_answers a JOIN live_players p ON p.id = a.player_id
       WHERE p.match_id = ?`,
      [match.id]
    ),
    one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM live_challenge_progress pr JOIN live_players p ON p.id = pr.player_id
       WHERE p.match_id = ? AND p.kicked_at IS NULL AND pr.finished_at IS NOT NULL`,
      [match.id]
    ),
  ]);

  const byId = new Map(questions.map((q) => [q.id, q]));
  const answers: AnswerRow[] = answerRows
    .filter((a) => byId.has(a.question_id))
    .map((a) => {
      const q = byId.get(a.question_id)!;
      return {
        nickname: a.nickname,
        kicked: a.kicked_at !== null,
        position: q.position,
        optionIndex: a.option_id === null ? null : q.optionIds.indexOf(a.option_id),
        text: a.text,
        isCorrect: a.is_correct === null ? null : a.is_correct === 1,
        responseMs: a.response_ms,
        points: a.points,
      };
    })
    .sort((x, y) => x.position - y.position || x.nickname.localeCompare(y.nickname, "es"));

  const players: PlayerRow[] = playerRows.map((p) => ({ nickname: p.nickname, kicked: p.kicked_at !== null, joinedAt: p.joined_at }));
  // Los expulsados quedan en el detalle y en el CSV, pero fuera del ranking y de los %.
  const active = players.filter((p) => !p.kicked);
  const activeAnswers = answers.filter((a) => !a.kicked);
  const lastPosition = Math.max(0, ...activeAnswers.map((a) => a.position));

  const ranking = computeLeaderboard(
    active.map((p, i) => ({ nickname: p.nickname, joinOrder: i })),
    activeAnswers,
    lastPosition,
    questions.filter((q) => scored(q.type)).map((q) => q.position)
  ).map((e) => {
    const mine = activeAnswers.filter((a) => a.nickname === e.nickname);
    return {
      ...e,
      // El movimiento solo tiene sentido en vivo.
      movement: 0,
      avgResponseMs: mine.length ? Math.round(mine.reduce((s, a) => s + a.responseMs, 0) / mine.length) : null,
    };
  });

  return {
    match: {
      ...match,
      gameId: match.game_id,
      gameTitle: match.game_title,
      // Hasta dónde llegó la partida: las preguntas posteriores no se jugaron. En un
      // desafío cada jugador va por su cuenta, así que todas cuentan como jugables.
      lastPosition: match.closes_at !== null ? questions.length : match.current_position,
      challengeOpen: match.closes_at !== null && match.status !== "finished" && sqliteToMs(match.closes_at) > Date.now(),
      players: active.length,
      answers: activeAnswers.length,
    },
    questions: questions.map((q) => ({
      ...q,
      players: active.length,
      stats: questionStats(q, activeAnswers.filter((a) => a.position === q.position)),
    })),
    ranking,
    players,
    answers,
    finished: finishedRow?.n ?? 0,
  };
}
