import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EXPERIENCES, RUTA_CAFE_FINCA, RUTA_CAFE_TRANSPORTE, RUTA_CAFE_TRILLADORA, seriesEntry, seriesFrom } from "./experiences/catalog.ts";
import { LIMITS, parseStoredTexts, publicExperience, riskResult, score, validateRiskTexts } from "./experiences/texts.ts";
import { FINCA_MAP } from "../components/experience/scenes/finca-map.ts";
import { TRANSPORTE_MAP } from "../components/experience/scenes/transporte-map.ts";
import { TRILLADORA_MAP } from "../components/experience/scenes/trilladora-map.ts";
import { TOSTION_MAP } from "../components/experience/scenes/tostion-map.ts";
import type { SceneMap } from "../components/experience/scenes/types.ts";

const MAPS: Record<string, SceneMap> = { finca: FINCA_MAP, transporte: TRANSPORTE_MAP, trilladora: TRILLADORA_MAP, tostion: TOSTION_MAP };

describe("catálogo", () => {
  test("los textos de fábrica pasan la misma validación que el editor", () => {
    for (const def of EXPERIENCES) {
      for (const risk of def.risks) {
        const r = validateRiskTexts({ ...risk.defaults, options: [...risk.defaults.options] });
        assert.ok(r.ok, `${def.key}/${risk.id}: ${r.ok ? "" : r.error}`);
      }
    }
  });

  test("ids de riesgo únicos en toda la serie (comparten la participación)", () => {
    for (const def of EXPERIENCES) {
      const ids = seriesFrom(seriesEntry(def)).flatMap((d) => d.risks.map((r) => r.id));
      assert.equal(new Set(ids).size, ids.length, def.series);
    }
  });

  test("la respuesta correcta no cae siempre en el mismo botón", () => {
    for (const def of EXPERIENCES) {
      const positions = new Set(def.risks.map((r) => r.defaults.correct));
      assert.equal(positions.size, 3, def.key);
    }
  });

  test("cada riesgo se puede encontrar en su escena y cada zona tiene nombre", () => {
    for (const def of EXPERIENCES) {
      const map = MAPS[def.scene];
      const reachable = new Set(Object.values(map.riskZones).flatMap((z) => Object.values(z)));
      for (const risk of def.risks) assert.ok(reachable.has(risk.id), `${def.key}: falta zona para ${risk.id}`);
      const known = new Set(def.risks.map((r) => r.id));
      for (const riskId of reachable) assert.ok(known.has(riskId), `${def.key}: zona apunta a un riesgo inexistente: ${riskId}`);
      const zones = [...Object.values(map.riskZones).flatMap((z) => Object.keys(z)), ...Object.keys(map.ok)];
      for (const z of zones) assert.ok(map.zoneLabels[z], `${def.key}: zona sin nombre: ${z}`);
    }
  });
});

describe("serie", () => {
  test("la ruta del café va de la finca al transporte y a la trilladora", () => {
    assert.deepEqual(
      seriesFrom(RUTA_CAFE_FINCA).map((d) => d.key),
      [RUTA_CAFE_FINCA.key, RUTA_CAFE_TRANSPORTE.key, RUTA_CAFE_TRILLADORA.key],
    );
    assert.deepEqual(
      seriesFrom(RUTA_CAFE_TRANSPORTE).map((d) => d.key),
      [RUTA_CAFE_TRANSPORTE.key, RUTA_CAFE_TRILLADORA.key],
    );
  });

  test("una estación siguiente se asigna con el código de la primera", () => {
    assert.equal(seriesEntry(RUTA_CAFE_TRANSPORTE).key, RUTA_CAFE_FINCA.key);
    assert.equal(seriesEntry(RUTA_CAFE_TRILLADORA).key, RUTA_CAFE_FINCA.key);
    assert.equal(seriesEntry(RUTA_CAFE_FINCA).key, RUTA_CAFE_FINCA.key);
  });

  test("el puntaje de la serie cuenta los riesgos de todas las estaciones", () => {
    const stations = seriesFrom(RUTA_CAFE_FINCA);
    const total = stations.reduce((acc, d) => acc + d.risks.length, 0);
    const rows = RUTA_CAFE_FINCA.risks.map((r) => ({ risk_id: r.id, option_index: r.defaults.correct, is_correct: 1 }));
    const s = score(rows, total);
    // 7 de 21 riesgos resueltos, todos a la primera.
    assert.equal(total, 21);
    assert.equal(s.avance, 33);
    assert.equal(s.puntaje, 3.3);
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
