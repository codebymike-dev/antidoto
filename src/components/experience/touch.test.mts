import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BASE_TOLERANCE, SMALLEST_ZONE_R, TOUCH_RADIUS_PX, touchTolerance } from "./touch.ts";

describe("tolerancia de toque", () => {
  test("en un celular la zona más chica llega a 44 px de diámetro", () => {
    for (const scale of [0.8, 0.93, 1.1]) {
      const diameter = 2 * (SMALLEST_ZONE_R + touchTolerance(scale)) * scale;
      assert.ok(diameter >= 2 * TOUCH_RADIUS_PX - 0.01, `escala ${scale}: ${diameter.toFixed(1)} px`);
    }
  });

  test("en una pantalla grande no baja de la tolerancia de siempre", () => {
    assert.equal(touchTolerance(2), BASE_TOLERANCE);
    assert.equal(touchTolerance(3.5), BASE_TOLERANCE);
  });

  test("una escala absurda no la dispara", () => {
    assert.ok(Number.isFinite(touchTolerance(0)));
    assert.ok(touchTolerance(0) <= TOUCH_RADIUS_PX / 0.1);
  });
});
