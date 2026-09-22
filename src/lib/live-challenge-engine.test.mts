import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CHALLENGE_MAX_DAYS,
  advance,
  challengePhase,
  challengeState,
  emptyProgress,
  parseClosesAt,
  questionExpired,
  sqliteToMs,
  type AdvanceContext,
} from "./live-challenge-engine.ts";
import { ANSWER_GRACE_MS, checkAnswer } from "./live-engine.ts";

const T0 = 1_700_000_000_000;

const ctx = (over: Partial<AdvanceContext> = {}): AdvanceContext => ({
  now: T0,
  totalQuestions: 2,
  timeLimitAt: () => 30,
  introMs: 4000,
  answeredCurrent: false,
  closed: false,
  ...over,
});

describe("advance", () => {
  test("abre la primera pregunta con la entrada y el reloj propio", () => {
    const res = advance(emptyProgress(), ctx());
    assert.ok(res.ok);
    assert.deepEqual(res.progress, {
      currentPosition: 1,
      questionStartedAt: T0 + 4000,
      questionEndsAt: T0 + 4000 + 30_000,
      finished: false,
    });
  });

  test("no deja saltar una pregunta abierta sin responder", () => {
    const open = advance(emptyProgress(), ctx());
    assert.ok(open.ok);
    const res = advance(open.progress, ctx({ now: T0 + 10_000 }));
    assert.equal(res.ok, false);
  });

  test("avanza si respondió o si venció el tiempo", () => {
    const open = advance(emptyProgress(), ctx());
    assert.ok(open.ok);
    assert.ok(advance(open.progress, ctx({ now: T0 + 10_000, answeredCurrent: true })).ok);
    const expired = open.progress.questionEndsAt! + ANSWER_GRACE_MS + 1;
    assert.ok(advance(open.progress, ctx({ now: expired })).ok);
  });

  test("después de la última pregunta termina", () => {
    const res = advance({ currentPosition: 2, questionStartedAt: T0, questionEndsAt: T0 + 1, finished: false }, ctx({ answeredCurrent: true }));
    assert.ok(res.ok);
    assert.equal(res.progress.finished, true);
  });

  test("no avanza si el desafío cerró o ya terminó", () => {
    assert.equal(advance(emptyProgress(), ctx({ closed: true })).ok, false);
    assert.equal(advance({ ...emptyProgress(), finished: true }, ctx()).ok, false);
  });
});

describe("challengePhase", () => {
  const open = { currentPosition: 1, questionStartedAt: T0, questionEndsAt: T0 + 30_000, finished: false };

  test("recorre intro, pregunta, resultado y final", () => {
    assert.equal(challengePhase(emptyProgress(), false, false, T0), "intro");
    assert.equal(challengePhase(open, false, false, T0 + 1000), "question");
    assert.equal(challengePhase(open, true, false, T0 + 1000), "feedback");
    assert.equal(challengePhase(open, false, false, T0 + 30_000 + ANSWER_GRACE_MS + 1), "feedback");
    assert.equal(challengePhase({ ...open, finished: true }, true, false, T0), "finished");
  });

  test("si el desafío cerró, pasa al resultado aunque no haya terminado", () => {
    assert.equal(challengePhase(open, false, true, T0 + 1000), "finished");
    assert.equal(challengePhase(emptyProgress(), false, true, T0), "finished");
  });
});

describe("challengeState + checkAnswer", () => {
  const q = { position: 1, type: "quiz" as const, timeLimit: 30, options: [{ correct: false }, { correct: true }] };
  const open = { currentPosition: 1, questionStartedAt: T0, questionEndsAt: T0 + 30_000, finished: false };

  test("puntúa con el reloj del jugador", () => {
    const res = checkAnswer(challengeState(open), q, { optionIndex: 1 }, T0, 0);
    assert.ok(res.ok);
    assert.equal(res.points, 1000);
  });

  test("rechaza respuestas fuera de tiempo o de otra pregunta", () => {
    assert.equal(checkAnswer(challengeState(open), q, { optionIndex: 1 }, T0 + 31_000, 0).ok, false);
    assert.equal(checkAnswer(challengeState(open), { ...q, position: 2 }, { optionIndex: 1 }, T0, 0).ok, false);
    assert.equal(checkAnswer(challengeState(emptyProgress()), q, { optionIndex: 1 }, T0, 0).ok, false);
  });

  test("questionExpired usa el mismo margen que en vivo", () => {
    assert.equal(questionExpired(open, T0 + 30_000 + ANSWER_GRACE_MS), false);
    assert.equal(questionExpired(open, T0 + 30_000 + ANSWER_GRACE_MS + 1), true);
  });
});

describe("parseClosesAt", () => {
  test("convierte a UTC en formato de SQLite", () => {
    // 18:00 en Colombia (UTC-5) son las 23:00 UTC.
    const res = parseClosesAt("2023-11-20T18:00:00-05:00", Date.parse("2023-11-14T12:00:00Z"));
    assert.deepEqual(res, { ok: true, value: "2023-11-20 23:00:00" });
    assert.equal(sqliteToMs("2023-11-20 23:00:00"), Date.parse("2023-11-20T23:00:00Z"));
  });

  test("rechaza vacío, pasado cercano y más del máximo", () => {
    assert.equal(parseClosesAt("", T0).ok, false);
    assert.equal(parseClosesAt("no es fecha", T0).ok, false);
    assert.equal(parseClosesAt(new Date(T0 + 60_000).toISOString(), T0).ok, false);
    assert.equal(parseClosesAt(new Date(T0 + (CHALLENGE_MAX_DAYS + 1) * 86_400_000).toISOString(), T0).ok, false);
    assert.ok(parseClosesAt(new Date(T0 + 86_400_000).toISOString(), T0).ok);
  });
});
