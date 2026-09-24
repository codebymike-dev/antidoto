import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EXPERIENCES, RUTA_CAFE_FINCA } from "./experiences/catalog.ts";
import { LIMITS, parseStoredTexts, publicExperience, riskResult, score, validateRiskTexts } from "./experiences/texts.ts";
import { FINCA_OK, FINCA_RISK_ZONES, FINCA_ZONE_LABELS } from "../components/experience/scenes/finca-map.ts";

describe("catálogo", () => {
  test("los textos de fábrica pasan la misma validación que el editor", () => {
    for (const def of EXPERIENCES) {
      for (const risk of def.risks) {
        const r = validateRiskTexts({ ...risk.defaults, options: [...risk.defaults.options] });
        assert.ok(r.ok, `${def.key}/${risk.id}: ${r.ok ? "" : r.error}`);
      }
    }
  });

  test("ids de riesgo únicos", () => {
    const ids = RUTA_CAFE_FINCA.risks.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("la respuesta correcta no cae siempre en el mismo botón", () => {
    const positions = new Set(RUTA_CAFE_FINCA.risks.map((r) => r.defaults.correct));
    assert.equal(positions.size, 3);
  });

  test("cada riesgo de la finca se puede encontrar en la escena y cada zona tiene nombre", () => {
    const reachable = new Set(Object.values(FINCA_RISK_ZONES).flatMap((z) => Object.values(z)));
    for (const risk of RUTA_CAFE_FINCA.risks) assert.ok(reachable.has(risk.id), `falta zona para ${risk.id}`);
    const known = new Set(RUTA_CAFE_FINCA.risks.map((r) => r.id));
    for (const riskId of reachable) assert.ok(known.has(riskId), `zona apunta a un riesgo inexistente: ${riskId}`);
    const zones = [...Object.values(FINCA_RISK_ZONES).flatMap((z) => Object.keys(z)), ...Object.keys(FINCA_OK)];
    for (const z of zones) assert.ok(FINCA_ZONE_LABELS[z], `zona sin nombre: ${z}`);
  });
});

describe("lo que ve el participante", () => {
  test("no incluye la respuesta ni la explicación", () => {
    const pub = publicExperience(RUTA_CAFE_FINCA, new Map());
    const json = JSON.stringify(pub);
    for (const risk of RUTA_CAFE_FINCA.risks) {
      assert.ok(!json.includes(risk.defaults.explanation));
      assert.ok(!json.includes(risk.defaults.practice));
    }
    assert.ok(pub.risks.every((r) => !("correct" in r)));
  });

  test("usa los textos editados cuando existen", () => {
    const edited = { ...RUTA_CAFE_FINCA.risks[0].defaults, prompt: "¿Pregunta nueva?" };
    const pub = publicExperience(RUTA_CAFE_FINCA, new Map([["espalda", edited]]));
    assert.equal(pub.risks[0].prompt, "¿Pregunta nueva?");
    assert.equal(pub.risks[1].prompt, RUTA_CAFE_FINCA.risks[1].defaults.prompt);
  });
});

describe("calificación", () => {
  test("puntaje sobre 10 por aciertos a la primera y avance por riesgos resueltos", () => {
    const s = score(
      [
        { risk_id: "a", option_index: 1, is_correct: 1 },
        { risk_id: "b", option_index: 0, is_correct: 0 },
        { risk_id: "c", option_index: null, is_correct: 0 },
      ],
      7,
    );
    assert.equal(s.answered, 3);
    assert.equal(s.correct, 1);
    assert.equal(s.revealed, 1);
    assert.equal(s.avance, 43);
    assert.equal(s.puntaje, 1.4);
    assert.equal(s.grains, 125);
  });

  test("todo bien a la primera da 10", () => {
    const rows = RUTA_CAFE_FINCA.risks.map((r) => ({ risk_id: r.id, option_index: r.defaults.correct, is_correct: 1 }));
    const s = score(rows, rows.length);
    assert.equal(s.puntaje, 10);
    assert.equal(s.avance, 100);
  });

  test("un riesgo revelado no cuenta como acierto", () => {
    const r = riskResult(RUTA_CAFE_FINCA.risks[0], RUTA_CAFE_FINCA.risks[0].defaults, null);
    assert.equal(r.correct, false);
    assert.equal(r.chosen, null);
  });
});

describe("edición de textos", () => {
  const base = {
    title: "Título",
    prompt: "¿Pregunta?",
    options: ["Uno", "Dos", "Tres"],
    correct: "2",
    explanation: "Porque sí.",
    practice: "Hazlo así.",
  };

  test("acepta un formulario válido y limpia espacios", () => {
    const r = validateRiskTexts({ ...base, title: "  Título   largo " });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.value.title, "Título largo");
      assert.equal(r.value.correct, 2);
    }
  });

  test("rechaza opciones repetidas, vacías o sin correcta", () => {
    assert.equal(validateRiskTexts({ ...base, options: ["Uno", "uno", "Tres"] }).ok, false);
    assert.equal(validateRiskTexts({ ...base, options: ["Uno", "", "Tres"] }).ok, false);
    assert.equal(validateRiskTexts({ ...base, correct: "3" }).ok, false);
    assert.equal(validateRiskTexts({ ...base, correct: null }).ok, false);
  });

  test("respeta los límites de largo", () => {
    assert.equal(validateRiskTexts({ ...base, prompt: "x".repeat(LIMITS.prompt + 1) }).ok, false);
    assert.equal(validateRiskTexts({ ...base, title: "x".repeat(LIMITS.title) }).ok, true);
  });

  test("una fila guardada con JSON roto se ignora", () => {
    const row = { title: "t", prompt: "p", options: "{", correct: 0, explanation: "e", practice: "b" };
    assert.equal(parseStoredTexts(row), null);
    assert.ok(parseStoredTexts({ ...row, options: JSON.stringify(["a", "b", "c"]) }));
  });
});
