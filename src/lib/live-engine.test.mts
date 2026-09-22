import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ANSWER_GRACE_MS,
  applyCommand,
  basePoints,
  checkAnswer,
  computeLeaderboard,
  currentStreak,
  generatePin,
  groupWords,
  initialMatchState,
  normalizeNickname,
  normalizeWord,
  questionStats,
  shouldEndQuestion,
  streakBonus,
  type CommandContext,
  type EngineQuestion,
  type MatchState,
} from "./live-engine.ts";

const T0 = 1_700_000_000_000;

function ctx(overrides: Partial<CommandContext> = {}): CommandContext {
  return { now: T0, totalQuestions: 3, activePlayers: 2, timeLimitAt: () => 20, ...overrides };
}

function run(state: MatchState, ...steps: [Parameters<typeof applyCommand>[1], Partial<CommandContext>?][]) {
  let s = state;
  for (const [cmd, c] of steps) {
    const res = applyCommand(s, cmd, ctx(c));
    assert.ok(res.ok, `${cmd}: ${res.ok ? "" : res.error}`);
    s = res.state;
  }
  return s;
}

const quiz: EngineQuestion = {
  position: 1,
  type: "quiz",
  timeLimit: 20,
  options: [{ correct: true }, { correct: false }, { correct: true }, { correct: false }],
};

describe("máquina de estados", () => {
  test("recorrido completo: lobby → preguntas → podio", () => {
    let s = run(initialMatchState(), ["start"]);
    assert.equal(s.status, "question");
    assert.equal(s.currentPosition, 1);
    assert.equal(s.questionEndsAt, T0 + 20_000);

    s = run(s, ["endQuestion"], ["showLeaderboard"], ["next", { now: T0 + 60_000 }]);
    assert.equal(s.status, "question");
    assert.equal(s.currentPosition, 2);
    assert.equal(s.questionStartedAt, T0 + 60_000);

    // Se puede saltar el ranking e ir directo a la siguiente.
    s = run(s, ["endQuestion"], ["next"]);
    assert.equal(s.currentPosition, 3);

    s = run(s, ["endQuestion"], ["next"]);
    assert.equal(s.status, "finished");
  });

  test("no arranca sin preguntas ni sin jugadores", () => {
    assert.equal(applyCommand(initialMatchState(), "start", ctx({ totalQuestions: 0 })).ok, false);
    assert.equal(applyCommand(initialMatchState(), "start", ctx({ activePlayers: 0 })).ok, false);
  });

  test("comandos fuera de orden se rechazan con un mensaje", () => {
    const lobby = initialMatchState();
    for (const cmd of ["endQuestion", "showLeaderboard", "next", "pause", "resume"] as const) {
      const res = applyCommand(lobby, cmd, ctx());
      assert.equal(res.ok, false, cmd);
      if (!res.ok) assert.ok(res.error.length > 0);
    }
    const q = run(lobby, ["start"]);
    assert.equal(applyCommand(q, "start", ctx()).ok, false);
    assert.equal(applyCommand(q, "showLeaderboard", ctx()).ok, false);
    assert.equal(applyCommand(q, "next", ctx()).ok, false);
  });

  test("una partida terminada no acepta más comandos", () => {
    const done = run(initialMatchState(), ["finish"]);
    assert.equal(done.status, "finished");
    assert.equal(applyCommand(done, "unlockJoin", ctx()).ok, false);
  });

  test("pausa guarda el tiempo restante y reanudar lo respeta sin contar la pausa", () => {
    let s = run(initialMatchState(), ["start"], ["pause", { now: T0 + 5_000 }]);
    assert.equal(s.pausedRemainingMs, 15_000);
    assert.equal(applyCommand(s, "pause", ctx()).ok, false);

    s = run(s, ["resume", { now: T0 + 65_000 }]);
    assert.equal(s.pausedRemainingMs, null);
    assert.equal(s.questionEndsAt, T0 + 80_000);
    // El inicio se corre la duración de la pausa: responder 1 s después de reanudar cuenta como 6 s.
    const check = checkAnswer(s, quiz, { optionIndex: 0 }, T0 + 66_000, 0);
    assert.ok(check.ok);
    if (check.ok) assert.equal(check.responseMs, 6_000);
  });

  test("no se pausa con el tiempo agotado", () => {
    const s = run(initialMatchState(), ["start"]);
    assert.equal(applyCommand(s, "pause", ctx({ now: T0 + 20_000 })).ok, false);
  });

  test("cerrar la entrada funciona en cualquier momento antes del final", () => {
    const s = run(initialMatchState(), ["lockJoin"], ["start"]);
    assert.equal(s.joinLocked, true);
    assert.equal(run(s, ["unlockJoin"]).joinLocked, false);
  });

  test("terminar antes de tiempo quita la pausa", () => {
    const s = run(initialMatchState(), ["start"], ["pause", { now: T0 + 1_000 }], ["finish"]);
    assert.equal(s.status, "finished");
    assert.equal(s.pausedRemainingMs, null);
  });
});

describe("entrada de la pregunta (¡Prepárate!)", () => {
  const intro = { introMs: 4_000 };

  test("el reloj arranca al terminar la entrada", () => {
    const s = run(initialMatchState(), ["start", intro]);
    assert.equal(s.questionStartedAt, T0 + 4_000);
    assert.equal(s.questionEndsAt, T0 + 24_000);
  });

  test("durante la entrada no se aceptan respuestas; después, el tiempo cuenta desde el inicio real", () => {
    const s = run(initialMatchState(), ["start", intro]);
    assert.equal(checkAnswer(s, quiz, { optionIndex: 0 }, T0 + 3_999, 0).ok, false);
    const res = checkAnswer(s, quiz, { optionIndex: 0 }, T0 + 5_000, 0);
    assert.ok(res.ok);
    if (res.ok) assert.equal(res.responseMs, 1_000);
  });

  test("pausar durante la entrada y reanudar conserva la entrada restante", () => {
    let s = run(initialMatchState(), ["start", intro], ["pause", { now: T0 + 1_000 }]);
    assert.equal(s.pausedRemainingMs, 23_000);
    s = run(s, ["resume", { now: T0 + 60_000 }]);
    assert.equal(s.questionStartedAt, T0 + 63_000);
    assert.equal(s.questionEndsAt, T0 + 83_000);
  });
});

describe("cierre automático de la pregunta", () => {
  const open = () => run(initialMatchState(), ["start"]);

  test("cierra cuando respondieron todos los activos", () => {
    assert.equal(shouldEndQuestion(open(), T0 + 1_000, 2, 2), true);
    assert.equal(shouldEndQuestion(open(), T0 + 1_000, 1, 2), false);
  });

  test("cierra al vencer el tiempo más el margen, no antes", () => {
    assert.equal(shouldEndQuestion(open(), T0 + 20_000 + ANSWER_GRACE_MS, 0, 2), false);
    assert.equal(shouldEndQuestion(open(), T0 + 20_001 + ANSWER_GRACE_MS, 0, 2), true);
  });

  test("en pausa nunca cierra solo", () => {
    const paused = run(open(), ["pause", { now: T0 + 1_000 }]);
    assert.equal(shouldEndQuestion(paused, T0 + 999_999, 2, 2), false);
  });
});

describe("puntaje", () => {
  test("1000 al instante, 500 al límite, 0 si falla", () => {
    assert.equal(basePoints(true, 0, 20_000), 1000);
    assert.equal(basePoints(true, 10_000, 20_000), 750);
    assert.equal(basePoints(true, 20_000, 20_000), 500);
    assert.equal(basePoints(true, 99_000, 20_000), 500);
    assert.equal(basePoints(false, 0, 20_000), 0);
  });

  test("bajo 0.5 s da el máximo aunque el tiempo sea corto", () => {
    // Con 5 s, 499 ms serían 950 por la fórmula; Kahoot da 1000.
    assert.equal(basePoints(true, 499, 5_000), 1000);
    assert.equal(basePoints(true, 500, 5_000), 950);
  });

  test("bono de racha: desde el segundo acierto, con tope", () => {
    assert.deepEqual([0, 1, 2, 3, 6, 10].map(streakBonus), [0, 0, 100, 200, 500, 500]);
  });

  test("la racha cuenta solo los aciertos seguidos al final del historial", () => {
    assert.equal(currentStreak([]), 0);
    assert.equal(currentStreak([true, true, false, true, true]), 2);
    assert.equal(currentStreak([true, false]), 0);
  });
});

describe("respuestas", () => {
  const open = () => run(initialMatchState(), ["start"]);

  test("quiz correcto: puntos por rapidez más racha", () => {
    const res = checkAnswer(open(), quiz, { optionIndex: 2 }, T0 + 4_000, 2);
    assert.ok(res.ok);
    if (!res.ok) return;
    assert.equal(res.isCorrect, true);
    assert.equal(res.streak, 3);
    assert.equal(res.points, 900 + 200);
  });

  test("quiz incorrecto: 0 puntos y corta la racha", () => {
    const res = checkAnswer(open(), quiz, { optionIndex: 1 }, T0 + 1_000, 4);
    assert.ok(res.ok);
    if (res.ok) assert.deepEqual([res.isCorrect, res.points, res.streak], [false, 0, 0]);
  });

  test("respuesta dentro del margen se acepta con el tiempo topado al límite", () => {
    const res = checkAnswer(open(), quiz, { optionIndex: 0 }, T0 + 20_000 + ANSWER_GRACE_MS, 0);
    assert.ok(res.ok);
    if (res.ok) {
      assert.equal(res.responseMs, 20_000);
      assert.equal(res.points, 500);
    }
  });

  test("tarde, en pausa, en otra pregunta o fuera de 'question' se rechaza", () => {
    assert.equal(checkAnswer(open(), quiz, { optionIndex: 0 }, T0 + 20_001 + ANSWER_GRACE_MS, 0).ok, false);
    const paused = run(open(), ["pause", { now: T0 + 1_000 }]);
    assert.equal(checkAnswer(paused, quiz, { optionIndex: 0 }, T0 + 2_000, 0).ok, false);
    assert.equal(checkAnswer(open(), { ...quiz, position: 2 }, { optionIndex: 0 }, T0 + 1_000, 0).ok, false);
    const revealed = run(open(), ["endQuestion"]);
    assert.equal(checkAnswer(revealed, quiz, { optionIndex: 0 }, T0 + 1_000, 0).ok, false);
  });

  test("opción fuera de rango o no entera se rechaza", () => {
    for (const optionIndex of [-1, 4, 1.5, NaN]) {
      assert.equal(checkAnswer(open(), quiz, { optionIndex }, T0 + 1_000, 0).ok, false, String(optionIndex));
    }
    assert.equal(checkAnswer(open(), quiz, { text: "hola" }, T0 + 1_000, 0).ok, false);
  });

  test("encuesta: sin correcta, sin puntos y sin tocar la racha", () => {
    const poll: EngineQuestion = { ...quiz, type: "encuesta", options: [{ correct: false }, { correct: false }] };
    const res = checkAnswer(open(), poll, { optionIndex: 1 }, T0 + 1_000, 3);
    assert.ok(res.ok);
    if (res.ok) assert.deepEqual([res.isCorrect, res.points, res.streak], [null, 0, 3]);
  });

  test("nube: normaliza el texto y rechaza vacíos", () => {
    const cloud: EngineQuestion = { ...quiz, type: "nube", options: [] };
    const res = checkAnswer(open(), cloud, { text: "  ¡Calma!  " }, T0 + 1_000, 1);
    assert.ok(res.ok);
    if (res.ok) assert.deepEqual([res.text, res.points, res.isCorrect, res.streak], ["Calma", 0, null, 1]);
    assert.equal(checkAnswer(open(), cloud, { text: " ... " }, T0 + 1_000, 0).ok, false);
    assert.equal(checkAnswer(open(), cloud, { optionIndex: 0 }, T0 + 1_000, 0).ok, false);
  });
});

describe("ranking", () => {
  const players = [
    { nickname: "Ana", joinOrder: 1 },
    { nickname: "Beto", joinOrder: 2 },
    { nickname: "Caro", joinOrder: 3 },
  ];

  test("ordena por puntaje, comparte puesto en empate y calcula el movimiento", () => {
    const answers = [
      { nickname: "Ana", position: 1, points: 900, isCorrect: true, responseMs: 2_000 },
      { nickname: "Beto", position: 1, points: 0, isCorrect: false, responseMs: 1_000 },
      { nickname: "Caro", position: 1, points: 900, isCorrect: true, responseMs: 2_000 },
      { nickname: "Beto", position: 2, points: 1_000, isCorrect: true, responseMs: 100 },
      { nickname: "Ana", position: 2, points: 0, isCorrect: false, responseMs: 500 },
    ];
    const board = computeLeaderboard(players, answers, 2);
    assert.deepEqual(
      board.map((e) => [e.nickname, e.rank, e.score, e.lastPoints, e.movement]),
      [
        ["Beto", 1, 1000, 1000, 2],
        ["Ana", 2, 900, 0, -1],
        ["Caro", 2, 900, 0, -1],
      ]
    );
  });

  test("con igual puntaje ordena primero a quien acertó más rápido", () => {
    const answers = [
      { nickname: "Ana", position: 1, points: 800, isCorrect: true, responseMs: 5_000 },
      { nickname: "Beto", position: 1, points: 800, isCorrect: true, responseMs: 3_000 },
    ];
    const board = computeLeaderboard(players.slice(0, 2), answers, 1);
    assert.deepEqual(board.map((e) => e.nickname), ["Beto", "Ana"]);
    assert.deepEqual(board.map((e) => e.rank), [1, 1]);
  });

  test("la racha va en cada entrada y se corta al fallar o no responder", () => {
    const answers = [
      { nickname: "Ana", position: 1, points: 900, isCorrect: true, responseMs: 1 },
      { nickname: "Ana", position: 2, points: 0, isCorrect: null, responseMs: 1 }, // encuesta: no cuenta
      { nickname: "Ana", position: 3, points: 1000, isCorrect: true, responseMs: 1 },
      { nickname: "Beto", position: 1, points: 900, isCorrect: true, responseMs: 1 },
      // Beto no respondió la 3.
      { nickname: "Caro", position: 1, points: 0, isCorrect: false, responseMs: 1 },
      { nickname: "Caro", position: 3, points: 900, isCorrect: true, responseMs: 1 },
    ];
    const board = computeLeaderboard(players, answers, 3, [1, 3]);
    const streak = Object.fromEntries(board.map((e) => [e.nickname, e.streak]));
    assert.deepEqual(streak, { Ana: 2, Beto: 0, Caro: 1 });
    // Hasta la 1, sin mirar la 3.
    assert.equal(computeLeaderboard(players, answers, 1, [1, 3]).find((e) => e.nickname === "Beto")?.streak, 1);
    // Beto tenía racha de 1 y la perdió en la 3; en la encuesta (2) nadie pierde nada.
    const lost = Object.fromEntries(board.map((e) => [e.nickname, e.lostStreak]));
    assert.deepEqual(lost, { Ana: 0, Beto: 1, Caro: 0 });
    assert.ok(computeLeaderboard(players, answers, 2, [1, 3]).every((e) => e.lostStreak === 0));
  });

  test("ignora respuestas de preguntas posteriores y de jugadores no listados", () => {
    const answers = [
      { nickname: "Ana", position: 3, points: 1_000, isCorrect: true, responseMs: 1 },
      { nickname: "Expulsado", position: 1, points: 1_000, isCorrect: true, responseMs: 1 },
    ];
    const board = computeLeaderboard(players, answers, 2);
    assert.ok(board.every((e) => e.score === 0));
    assert.equal(board.length, 3);
  });
});

describe("estadísticas y nube", () => {
  test("distribución, % de acierto y tiempo promedio", () => {
    const stats = questionStats(quiz, [
      { optionIndex: 0, text: null, isCorrect: true, responseMs: 1_000 },
      { optionIndex: 1, text: null, isCorrect: false, responseMs: 3_000 },
      { optionIndex: 0, text: null, isCorrect: true, responseMs: 2_000 },
    ]);
    assert.deepEqual(stats.distribution, [2, 1, 0, 0]);
    assert.equal(stats.correctPct, 67);
    assert.equal(stats.avgResponseMs, 2_000);
  });

  test("sin respuestas no divide por cero", () => {
    const stats = questionStats(quiz, []);
    assert.equal(stats.correctPct, null);
    assert.equal(stats.avgResponseMs, null);
  });

  test("agrupa sin distinguir mayúsculas y conserva tildes", () => {
    const words = groupWords(["calma", "Calma", "CALMA", "energía", "energia", "  ", "¡Calma!"]);
    assert.deepEqual(words[0], { text: "Calma", count: 4 });
    assert.equal(words.length, 3);
  });

  test("normalizeWord limpia bordes, controles y largo", () => {
    assert.equal(normalizeWord("  hola   mundo  "), "hola mundo");
    assert.equal(normalizeWord("\u0007¿qué?"), "qué");
    assert.equal(normalizeWord("x".repeat(80)).length, 30);
  });
});

describe("entrada", () => {
  test("PIN de 6 dígitos sin cero inicial", () => {
    assert.equal(generatePin(() => 0), "100000");
    assert.equal(generatePin(() => 0.999999), "999999");
    for (let i = 0; i < 200; i++) assert.match(generatePin(), /^[1-9]\d{5}$/);
  });

  test("apodo: recorta, quita invisibles y limita largo", () => {
    assert.deepEqual(normalizeNickname("  Ana   María "), { ok: true, nickname: "Ana María" });
    assert.deepEqual(normalizeNickname("A\u200bna"), { ok: true, nickname: "Ana" });
    assert.equal(normalizeNickname("   ").ok, false);
    assert.equal(normalizeNickname("\u200b\u200b").ok, false);
    assert.equal(normalizeNickname("x".repeat(21)).ok, false);
    assert.equal(normalizeNickname("😀".repeat(20)).ok, true);
  });
});
