import { test } from "node:test";
import assert from "node:assert/strict";
import { SeqQueue } from "./sync.ts";

const b = (seq: number, mine = false) => ({ seq, mine, ops: [] });

test("entrega en orden aunque lleguen desordenados", () => {
  const q = new SeqQueue(0);
  assert.deepEqual(q.push(b(2), 0), []);
  assert.deepEqual(q.push(b(1), 0).map((x) => x.seq), [1, 2]);
  assert.equal(q.last, 2);
});

test("un lote repetido se entrega una vez y conserva la marca de propio", () => {
  const q = new SeqQueue(0);
  q.push(b(2, true), 0);
  const out = q.push(b(1), 0).concat(q.push(b(2, false), 0));
  assert.deepEqual(out.map((x) => [x.seq, x.mine]), [[1, false], [2, true]]);
});

test("un hueco largo pide resincronizar y el reset aplica lo que ya había llegado", () => {
  const q = new SeqQueue(5);
  q.push(b(8), 1000);
  assert.ok(!q.stalled(2000));
  assert.ok(q.stalled(2600));
  q.reset(7);
  assert.deepEqual(q.drain(2700).map((x) => x.seq), [8]);
  assert.ok(!q.stalled(9999));
  assert.deepEqual(q.push(b(3), 0), [], "lo viejo se ignora");
});
