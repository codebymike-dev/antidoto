// Miniaturas 3D de la bandeja, dibujadas con el mismo renderer en un render target (sin abrir
// otro contexto WebGL). El color activo se ve como ladrillo de verdad, no como un círculo plano
// (investigación, sección 4.5).

import * as THREE from "three";
import { BRICK_COLORS } from "@/lib/bricks/palette";
import { part } from "@/lib/bricks/parts";
import { PLATE_H } from "@/lib/bricks/units";
import { localCell } from "@/lib/bricks/world";
import { studGeometry } from "../geometry";
import { absMaterial, metalMaterial, transMaterial } from "../material";
import { partGeometry } from "../part-geometry";

export function renderThumbs(renderer: THREE.WebGLRenderer, env: THREE.Texture | null, partIds: number[], color: number, size: number): Map<number, string> {
  const out = new Map<number, string>();
  const finish = BRICK_COLORS[color].finish;
  const mat = (finish === "metal" ? metalMaterial("alto") : finish === "trans" ? transMaterial("medio") : absMaterial("alto")) as THREE.MeshStandardMaterial;
  mat.color.set(BRICK_COLORS[color].hex);
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(3, 6, 4);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const target = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const pixels = new Uint8Array(size * size * 4);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const stud = studGeometry(16, 2);
  const glassMat = transMaterial("medio") as THREE.MeshPhysicalMaterial;
  glassMat.color.set(BRICK_COLORS.find((c) => c.name === "Cristal Celeste")!.hex);
  const prevTarget = renderer.getRenderTarget();

  for (const id of partIds) {
    const p = part(id);
    const group = new THREE.Group();
    // Geometría compartida (en caché): no se libera aquí.
    const mesh = partGeometry(p, { bevel: 2, radial: 16 });
    group.add(new THREE.Mesh(mesh.body, mat));
    if (mesh.glass) group.add(new THREE.Mesh(mesh.glass, glassMat));
    const studs = new THREE.InstancedMesh(stud, mat, p.w * p.d);
    let n = 0;
    const m = new THREE.Matrix4();
    for (let i = 0; i < p.w; i++) for (let k = 0; k < p.d; k++) if (p.top[localCell(p, 0, i, k)]) studs.setMatrixAt(n++, m.makeTranslation(i, p.h * PLATE_H, k));
    studs.count = n;
    group.add(studs);
    // Centrada y encuadrada según su tamaño, vista de tres cuartos desde arriba.
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    group.position.sub(center);
    scene.add(group);
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(15)) * 0.92;
    camera.position.set(1, 0.95, 1.25).normalize().multiplyScalar(dist);
    camera.lookAt(0, 0, 0);

    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    // El render target viene de abajo hacia arriba: se da vuelta al copiarlo.
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(pixels.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    ctx.putImageData(img, 0, 0);
    out.set(id, canvas.toDataURL("image/png"));

    scene.remove(group);
    studs.dispose();
  }

  renderer.setRenderTarget(prevTarget);
  target.dispose();
  stud.dispose();
  mat.dispose();
  glassMat.dispose();
  return out;
}
