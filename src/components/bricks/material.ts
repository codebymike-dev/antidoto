// Materiales del plástico por nivel de calidad. Valores de docs/investigacion-construccion-3d.md
// (sección 4.4): el realismo sale del ruido fino de superficie, no del brillo.

import * as THREE from "three";

export type Tier = "bajo" | "medio" | "alto" | "ultra";

let noiseMap: THREE.DataTexture | null = null;

/**
 * Mapa normal de ruido fino y repetible (sin costuras), generado en el navegador. Rompe el
 * reflejo "de espejo" que delata a un plástico de computador.
 */
export function plasticNoise(): THREE.DataTexture {
  if (noiseMap) return noiseMap;
  const N = 128;
  const height = new Float32Array(N * N);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Suma de dos octavas de ruido de valor con envoltura, para que se repita sin bordes.
  for (const [cells, amp] of [[16, 1], [48, 0.5]] as const) {
    const grid = Array.from({ length: cells * cells }, rnd);
    const at = (i: number, k: number) => grid[((k + cells) % cells) * cells + ((i + cells) % cells)];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx = (x / N) * cells;
        const fy = (y / N) * cells;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = fx - ix;
        const ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const top = at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx;
        const bottom = at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx;
        height[y * N + x] += (top * (1 - sy) + bottom * sy) * amp;
      }
  }
  const data = new Uint8Array(N * N * 4);
  const h = (x: number, y: number) => height[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = h(x + 1, y) - h(x - 1, y);
      const dy = h(x, y + 1) - h(x, y - 1);
      const n = new THREE.Vector3(-dx, -dy, 1).normalize();
      const o = (y * N + x) * 4;
      data[o] = (n.x * 0.5 + 0.5) * 255;
      data[o + 1] = (n.y * 0.5 + 0.5) * 255;
      data[o + 2] = (n.z * 0.5 + 0.5) * 255;
      data[o + 3] = 255;
    }
  noiseMap = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  noiseMap.wrapS = noiseMap.wrapT = THREE.RepeatWrapping;
  noiseMap.repeat.set(3, 3);
  noiseMap.generateMipmaps = true;
  noiseMap.minFilter = THREE.LinearMipmapLinearFilter;
  noiseMap.needsUpdate = true;
  return noiseMap;
}

const NOISE_SCALE = new THREE.Vector2(0.05, 0.05);

/** Plástico ABS. El clearcoat (segunda capa especular) solo en los niveles altos. */
export function absMaterial(tier: Tier): THREE.Material {
  const common = { color: 0xffffff, roughness: 0.3, metalness: 0, normalMap: plasticNoise(), normalScale: NOISE_SCALE };
  if (tier === "bajo" || tier === "medio") return new THREE.MeshStandardMaterial(common);
  return new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.32, ior: 1.5, clearcoat: 0.4, clearcoatRoughness: 0.1 });
}

/** Acabado metálico perlado (Oro Muisca). */
export function metalMaterial(tier: Tier): THREE.Material {
  const common = { color: 0xffffff, roughness: 0.35, metalness: 0.85, normalMap: plasticNoise(), normalScale: NOISE_SCALE };
  if (tier === "bajo" || tier === "medio") return new THREE.MeshStandardMaterial(common);
  return new THREE.MeshPhysicalMaterial({ ...common, clearcoat: 0.2, clearcoatRoughness: 0.15, iridescence: 0.25 });
}

/**
 * Policarbonato translúcido. La refracción real (`transmission`) cuesta un pase de render
 * extra, así que solo va en ultra; en los demás, opacidad más el reflejo del entorno.
 */
export function transMaterial(tier: Tier): THREE.Material {
  if (tier === "ultra")
    return new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, ior: 1.58, transmission: 0.95, thickness: 0.6 });
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.06,
    metalness: 0,
    ior: 1.58,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
}
