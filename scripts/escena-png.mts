// Renderiza la escena de la finca a PNG desde Node, para revisar el pixel art sin abrir
// el navegador. Uso:
//   node scripts/escena-png.mts [carpeta] [escala]
// Deja momento-1.png, momento-2.png, momento-3.png, intro-*.png y final-*.png.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { PixelBuffer } from "../src/components/experience/pixel/buffer.ts";
import { FincaScene, type Moment } from "../src/components/experience/scenes/finca.ts";

const outDir = process.argv[2] ?? "escena-png";
const scale = Number(process.argv[3] ?? 3);
mkdirSync(outDir, { recursive: true });

function crc32(buf: Uint8Array) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(new Uint8Array(out.subarray(4, 8 + data.length))), 8 + data.length);
  return out;
}

function png(buf: PixelBuffer, k: number) {
  const w = buf.w * k;
  const h = buf.h * k;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const c = buf.data[Math.floor(y / k) * buf.w + Math.floor(x / k)];
      const o = y * (w * 4 + 1) + 1 + x * 4;
      raw[o] = c & 255;
      raw[o + 1] = (c >>> 8) & 255;
      raw[o + 2] = (c >>> 16) & 255;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array()),
  ]);
}

const frame = new PixelBuffer(400, 250);
const save = (scene: FincaScene, name: string) => {
  scene.render(frame);
  writeFileSync(join(outDir, `${name}.png`), png(frame, scale));
};
const run = (scene: FincaScene, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 30) {
    scene.update(1 / 30);
    scene.render(frame);
  }
};

for (const m of [1, 2, 3] as Moment[]) {
  const scene = new FincaScene();
  scene.render(frame);
  if (m !== 1) {
    scene.setMoment(m === 2 ? 2 : 2);
    run(scene, 1);
    if (m === 3) {
      scene.setMoment(3);
      run(scene, 4);
    }
  }
  run(scene, 0.2);
  save(scene, `momento-${m}`);
  if (process.argv.includes("--zonas")) {
    for (const z of scene.zones()) {
      for (let a = 0; a < 360; a += 10) {
        frame.px(z.x + Math.cos((a * Math.PI) / 180) * z.r, z.y + Math.sin((a * Math.PI) / 180) * z.r, 0xff00ffff);
      }
    }
    writeFileSync(join(outDir, `zonas-${m}.png`), png(frame, scale));
  }
}

const said: string[] = [];
const intro = new FincaScene({ say: (t) => said.push(t) });
intro.playIntro(() => said.push("(fin de la intro)"));
for (const [k, secs] of [[1, 1.2], [2, 2.6], [3, 2.2], [4, 2.4]] as const) {
  run(intro, secs);
  save(intro, `intro-${k}`);
}

const good = new FincaScene({ say: (t) => said.push(t) });
good.playGoodPractice(() => said.push("(fin del final)"));
for (const [k, secs] of [[1, 2.2], [2, 3.2], [3, 2.6], [4, 3.4], [5, 4], [6, 3]] as const) {
  run(good, secs);
  save(good, `final-${k}`);
}
console.log(said.join("\n"));
