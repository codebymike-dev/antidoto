import { test } from "node:test";
import assert from "node:assert/strict";
import { labModel } from "./lab-model.ts";
import { BRICK_COLORS } from "./palette.ts";

const cell = (x: number, y: number, z: number) => `${x},${y},${z}`;

for (const count of [500, 1500, 3000]) {
  test(`la ciudad de ${count} es válida`, () => {
    const { bricks, base } = labModel(count);
    assert.equal(bricks.length, count);

    const occupied = new Set<string>();
    for (const b of bricks) {
      assert.ok(b.color >= 0 && b.color < BRICK_COLORS.length);
      assert.ok(b.x >= 0 && b.z >= 0 && b.x + b.w <= base && b.z + b.d <= base, "dentro de la base");
      for (let i = 0; i < b.w; i++)
        for (let k = 0; k < b.d; k++)
          for (let j = 0; j < b.h; j++) {
            const c = cell(b.x + i, b.y + j, b.z + k);
            assert.ok(!occupied.has(c), `dos piezas en ${c}`);
            occupied.add(c);
          }
    }
    // Nada flota: cada pieza toca la base o tiene algo justo debajo.
    for (const b of bricks) {
      if (b.y === 0) continue;
      let supported = false;
      for (let i = 0; i < b.w && !supported; i++)
        for (let k = 0; k < b.d && !supported; k++) supported = occupied.has(cell(b.x + i, b.y - 1, b.z + k));
      assert.ok(supported, `pieza flotante en ${cell(b.x, b.y, b.z)}`);
    }
  });
}

test("la misma cantidad da la misma ciudad", () => {
  assert.deepEqual(labModel(1500), labModel(1500));
});
