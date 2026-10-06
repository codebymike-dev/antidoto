// La vista de un BrickWorld: cuerpos en un BatchedMesh por acabado (se agregan y quitan de a
// una pieza, sin rearmar todo) y studs en un InstancedMesh que se recalcula al cambiar algo,
// porque una pieza nueva tapa studs de otras. Más el fantasma, la selección y la animación de
// encaje (investigación, secciones 3.6 y 5).

import * as THREE from "three";
import { BRICK_COLORS, type BrickFinish } from "@/lib/bricks/palette";
import { PARTS, part } from "@/lib/bricks/parts";
import { PLATE_H } from "@/lib/bricks/units";
import { partTransform } from "@/lib/bricks/rotation";
import { footprint, localCell, type Brick, type BrickWorld, type Placement } from "@/lib/bricks/world";
import { bodyGeometry, studGeometry } from "../geometry";
import { absMaterial, metalMaterial, transMaterial, type Tier } from "../material";
import { disposePartGeometries, partGeometry, partMatrix, type GeometryDetail } from "../part-geometry";
import type { Stage } from "../stage";

const DETAIL: Record<Tier, { bevel: number; studSegments: number; studArc: number }> = {
  bajo: { bevel: 1, studSegments: 10, studArc: 1 },
  medio: { bevel: 2, studSegments: 14, studArc: 2 },
  alto: { bevel: 2, studSegments: 18, studArc: 3 },
  ultra: { bevel: 3, studSegments: 24, studArc: 4 },
};

const BASE_COLOR = "#9AA3A8";
const MAX_BRICKS = 4000;
const REDUCED = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const finishOf = (color: number): BrickFinish => BRICK_COLORS[color].finish;
/** El vidrio de ventanas y puertas va siempre en cristal, sea cual sea el color del marco. */
const GLASS_COLOR = BRICK_COLORS.findIndex((c) => c.name === "Cristal Celeste");

export function detailFor(tier: Tier): GeometryDetail {
  return { bevel: DETAIL[tier].bevel, radial: DETAIL[tier].studSegments };
}

interface Layer {
  bodies: THREE.BatchedMesh;
  studs: THREE.InstancedMesh;
}

export class WorldView {
  readonly group = new THREE.Group();
  private stage: Stage;
  private world: BrickWorld;
  private materials: Record<BrickFinish, THREE.Material>;
  /** Id de geometría en los BatchedMesh, por pieza; el vidrio, por pieza también. */
  private geoIds = new Map<number, number>();
  private glassIds = new Map<number, number>();
  private stud: THREE.BufferGeometry;
  private layers: Record<BrickFinish, Layer>;
  private instances = new Map<string, { finish: BrickFinish; id: number; glass?: number }>();
  private hidden = new Set<string>();
  /** Piezas cayendo: sus studs aparecen al terminar, para que no queden flotando. */
  private dropping = new Set<string>();
  private floating = new Set<string>();
  private disposables: { dispose(): void }[] = [];
  private tmpM = new THREE.Matrix4();
  private tmpC = new THREE.Color();

  constructor(stage: Stage, world: BrickWorld) {
    this.stage = stage;
    this.world = world;
    const tier = stage.tier;
    const { bevel, studSegments, studArc } = DETAIL[tier];
    this.materials = { abs: absMaterial(tier), metal: metalMaterial(tier), trans: transMaterial(tier) };
    this.disposables.push(...Object.values(this.materials));
    this.stud = studGeometry(studSegments, studArc);
    this.disposables.push(this.stud);

    // Todas las piezas del catálogo, más el vidrio de las que lo tienen. Se agregan en el mismo
    // orden a las tres capas, así los ids de geometría coinciden entre capas.
    const detail: GeometryDetail = { bevel, radial: studSegments };
    const geos: { part: number; glass: boolean; g: THREE.BufferGeometry }[] = [];
    for (const p of PARTS) {
      const m = partGeometry(p, detail);
      geos.push({ part: p.id, glass: false, g: m.body });
      if (m.glass) geos.push({ part: p.id, glass: true, g: m.glass });
    }
    let verts = 0;
    let indices = 0;
    for (const { g } of geos) {
      verts += g.attributes.position.count;
      indices += g.index ? g.index.count : 0;
    }

    const layer = (finish: BrickFinish): Layer => {
      const bodies = new THREE.BatchedMesh(MAX_BRICKS, verts, indices, this.materials[finish]);
      for (const { part: id, glass, g } of geos) {
        const gid = bodies.addGeometry(g);
        if (finish === "abs") (glass ? this.glassIds : this.geoIds).set(id, gid);
      }
      bodies.castShadow = finish !== "trans";
      bodies.receiveShadow = true;
      if (finish === "trans") bodies.sortObjects = true;
      const studs = new THREE.InstancedMesh(this.stud, this.materials[finish], 256);
      studs.count = 0;
      studs.castShadow = finish !== "trans";
      studs.receiveShadow = true;
      studs.frustumCulled = false;
      this.group.add(bodies, studs);
      this.disposables.push(bodies, studs);
      return { bodies, studs };
    };
    this.layers = { abs: layer("abs"), metal: layer("metal"), trans: layer("trans") };

    // La base: una placa grande con la cara superior en y = 0.
    const baseGeo = bodyGeometry(world.base, world.base, 1, 1);
    const baseMat = absMaterial(tier === "bajo" ? "bajo" : "medio") as THREE.MeshStandardMaterial;
    baseMat.color.set(BASE_COLOR);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -PLATE_H;
    base.receiveShadow = true;
    this.group.add(base);
    this.disposables.push(baseGeo, baseMat);

    for (const b of world.bricks.values()) this.addInstance(b);
    this.refreshStuds();
  }

  /** Matriz de una pieza, con el mismo giro que usa el motor para sus máscaras. */
  private matrixFor(b: Placement, lift = 0): THREE.Matrix4 {
    return partMatrix(partTransform(part(b.part), b.rot), b.x, b.y * PLATE_H + lift, b.z, this.tmpM);
  }

  private colorFor(b: Brick): THREE.Color {
    this.tmpC.set(BRICK_COLORS[b.color].hex);
    // Pieza suelta: se aclara para que se vea que no está agarrada a nada.
    if (this.floating.has(b.id)) this.tmpC.lerp(new THREE.Color("#ffffff"), 0.45);
    return this.tmpC;
  }

  private addInstance(b: Brick) {
    const finish = finishOf(b.color);
    const layer = this.layers[finish];
    const id = layer.bodies.addInstance(this.geoIds.get(b.part)!);
    layer.bodies.setMatrixAt(id, this.matrixFor(b));
    layer.bodies.setColorAt(id, this.colorFor(b));
    const glassGeo = this.glassIds.get(b.part);
    let glass: number | undefined;
    if (glassGeo !== undefined) {
      const trans = this.layers.trans.bodies;
      glass = trans.addInstance(glassGeo);
      trans.setMatrixAt(glass, this.matrixFor(b));
      trans.setColorAt(glass, this.tmpC.set(BRICK_COLORS[GLASS_COLOR].hex));
    }
    this.instances.set(b.id, { finish, id, glass });
  }

  private removeInstance(brickId: string) {
    const inst = this.instances.get(brickId);
    if (!inst) return;
    this.layers[inst.finish].bodies.deleteInstance(inst.id);
    if (inst.glass !== undefined) this.layers.trans.bodies.deleteInstance(inst.glass);
    this.instances.delete(brickId);
  }

  /** Vuelve a leer el mundo: agrega, quita y repinta lo que cambió. */
  sync(floating: Set<string>) {
    this.floating = floating;
    for (const id of [...this.instances.keys()]) if (!this.world.bricks.has(id)) this.removeInstance(id);
    for (const b of this.world.bricks.values()) {
      const inst = this.instances.get(b.id);
      // Si cambió de acabado (de ABS a cristal, por ejemplo), se rehace en la otra capa.
      if (inst && inst.finish !== finishOf(b.color)) this.removeInstance(b.id);
      if (!this.instances.has(b.id)) this.addInstance(b);
      const now = this.instances.get(b.id)!;
      const layer = this.layers[now.finish].bodies;
      const visible = !this.hidden.has(b.id);
      layer.setMatrixAt(now.id, this.matrixFor(b));
      layer.setColorAt(now.id, this.colorFor(b));
      layer.setVisibleAt(now.id, visible);
      if (now.glass !== undefined) {
        this.layers.trans.bodies.setMatrixAt(now.glass, this.matrixFor(b));
        this.layers.trans.bodies.setVisibleAt(now.glass, visible);
      }
    }
    this.refreshStuds();
    this.stage.invalidateShadows();
  }

  /** Esconde una pieza mientras se mueve (sigue en el mundo hasta soltarla). */
  setHidden(ids: string[]) {
    this.hidden = new Set(ids);
    this.sync(this.floating);
  }

  private refreshStuds() {
    const lists: Record<BrickFinish, { x: number; y: number; z: number; c: THREE.Color }[]> = { abs: [], metal: [], trans: [] };
    const baseColor = new THREE.Color(BASE_COLOR);
    for (let x = 0; x < this.world.base; x++)
      for (let z = 0; z < this.world.base; z++) if (!this.world.at(x, 0, z)) lists.abs.push({ x, y: 0, z, c: baseColor });
    for (const b of this.world.bricks.values()) {
      if (this.hidden.has(b.id) || this.dropping.has(b.id)) continue;
      const p = part(b.part);
      const { w, d } = footprint(p, b.rot);
      const top = b.y + p.h;
      const color = this.colorFor(b).clone();
      for (let i = 0; i < w; i++)
        for (let k = 0; k < d; k++) {
          if (!p.top[localCell(p, b.rot, i, k)]) continue;
          const above = this.world.at(b.x + i, top, b.z + k);
          if (above && !this.hidden.has(above.id)) continue;
          lists[finishOf(b.color)].push({ x: b.x + i, y: top, z: b.z + k, c: color });
        }
    }
    for (const finish of ["abs", "metal", "trans"] as const) {
      const list = lists[finish];
      let mesh = this.layers[finish].studs;
      if (list.length > mesh.instanceMatrix.count) {
        // Sin espacio: uno nuevo con el doble de capacidad.
        const bigger = new THREE.InstancedMesh(this.stud, this.materials[finish], Math.max(list.length, mesh.instanceMatrix.count * 2));
        bigger.castShadow = mesh.castShadow;
        bigger.receiveShadow = true;
        bigger.frustumCulled = false;
        this.group.remove(mesh);
        mesh.dispose();
        this.group.add(bigger);
        this.disposables.push(bigger);
        this.layers[finish].studs = mesh = bigger;
      }
      list.forEach((s, i) => {
        mesh.setMatrixAt(i, this.tmpM.makeTranslation(s.x, s.y * PLATE_H, s.z));
        mesh.setColorAt(i, s.c);
      });
      mesh.count = list.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Encaje: la pieza nueva cae los últimos milímetros, baja un poco de más y vuelve (80 a
   * 120 ms). Se anima moviendo su instancia; sus studs aparecen al asentarse.
   */
  animateDrop(brickId: string) {
    const inst = this.instances.get(brickId);
    const b = this.world.bricks.get(brickId);
    if (!inst || !b || REDUCED) return;
    const bodies = this.layers[inst.finish].bodies;
    const start = performance.now();
    const DROP = 0.35;
    this.dropping.add(brickId);
    this.refreshStuds();
    this.stage.addHook((now) => {
      const t = Math.min(1, (now - start) / 140);
      // Cae con aceleración y rebota una vez por debajo del punto final.
      const lift = t < 0.6 ? DROP * (1 - (t / 0.6) ** 2) : -0.04 * Math.sin(((t - 0.6) / 0.4) * Math.PI);
      const alive = this.instances.get(brickId) === inst;
      if (alive) {
        bodies.setMatrixAt(inst.id, this.matrixFor(b, t < 1 ? lift : 0));
        if (inst.glass !== undefined) this.layers.trans.bodies.setMatrixAt(inst.glass, this.matrixFor(b, t < 1 ? lift : 0));
      }
      if (t >= 1 || !alive) {
        this.dropping.delete(brickId);
        this.refreshStuds();
        return false;
      }
      return true;
    });
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    disposePartGeometries();
  }
}

/** Fantasma: la pieza en mano, translúcida, con contorno y sombra sobre la superficie. */
export class Ghost {
  readonly group = new THREE.Group();
  /** Lleva el giro de la pieza: el cuerpo y su contorno se dibujan sin rotar adentro. */
  private holder = new THREE.Group();
  private body: THREE.Mesh;
  private glass: THREE.Mesh;
  private studs: THREE.InstancedMesh;
  private outline: THREE.LineSegments;
  private shadow: THREE.Mesh;
  private bodyMat: THREE.MeshStandardMaterial;
  private solid = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.95, depthTest: false });
  private dashed = new THREE.LineDashedMaterial({ color: "#ffffff", dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.95, depthTest: false });
  private key = "";

  constructor() {
    this.bodyMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.35, transparent: true, opacity: 0.55, depthWrite: false });
    this.body = new THREE.Mesh(new THREE.BufferGeometry(), this.bodyMat);
    this.glass = new THREE.Mesh(new THREE.BufferGeometry(), this.bodyMat);
    this.holder.matrixAutoUpdate = false;
    this.studs = new THREE.InstancedMesh(studGeometry(12, 2), this.bodyMat, 64);
    this.studs.count = 0;
    this.outline = new THREE.LineSegments(new THREE.BufferGeometry(), this.solid);
    this.outline.renderOrder = 10;
    // Sombra suave bajo la pieza: la pista de profundidad más barata (Bricktales).
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, "rgba(0,0,0,0.55)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.holder.add(this.body, this.glass, this.outline);
    this.group.add(this.shadow, this.holder, this.studs);
    this.group.visible = false;
  }

  show(pl: Placement, color: number, ok: boolean) {
    const p = part(pl.part);
    const { w, d } = footprint(p, pl.rot);
    const key = `${pl.part}:${pl.rot}`;
    if (key !== this.key) {
      this.key = key;
      // Geometría compartida (en caché): no se libera aquí.
      const mesh = partGeometry(p, { bevel: 1, radial: 12 });
      this.body.geometry = mesh.body;
      this.glass.geometry = mesh.glass ?? new THREE.BufferGeometry();
      this.holder.matrix.copy(partMatrix(partTransform(p, pl.rot), 0, 0, 0));
      this.holder.matrixWorldNeedsUpdate = true;
      this.outline.geometry.dispose();
      const edges = new THREE.EdgesGeometry(this.body.geometry, 30);
      this.outline.geometry = edges;
      this.outline.computeLineDistances();
      let n = 0;
      const m = new THREE.Matrix4();
      for (let i = 0; i < w; i++)
        for (let k = 0; k < d; k++)
          if (p.top[localCell(p, pl.rot, i, k)]) this.studs.setMatrixAt(n++, m.makeTranslation(i, p.h * PLATE_H, k));
      this.studs.count = n;
      this.studs.instanceMatrix.needsUpdate = true;
      this.shadow.scale.set(w + 0.6, d + 0.6, 1);
      this.shadow.position.set(w / 2, 0.004, d / 2);
    }
    this.group.position.set(pl.x, pl.y * PLATE_H, pl.z);
    // Válido: el color real. Inválido: gris neutro y contorno discontinuo (nunca solo rojo/verde).
    this.bodyMat.color.set(ok ? BRICK_COLORS[color].hex : "#8A9399");
    this.bodyMat.opacity = ok ? 0.6 : 0.35;
    this.outline.material = ok ? this.solid : this.dashed;
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  get visible() {
    return this.group.visible;
  }

  /** Centro de la cara superior, para poner el ícono de "no cabe" o medir distancia al dedo. */
  topCenter(): THREE.Vector3 {
    const box = new THREE.Box3().setFromObject(this.body);
    return new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
  }

  dispose() {
    this.outline.geometry.dispose();
    this.studs.geometry.dispose();
    this.bodyMat.dispose();
    this.solid.dispose();
    this.dashed.dispose();
  }
}

/** Contorno doble (claro y oscuro) de la pieza seleccionada: se ve sobre cualquier color. */
export class SelectionOutline {
  readonly group = new THREE.Group();
  private light: THREE.LineSegments;
  private dark: THREE.LineSegments;

  constructor() {
    this.light = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#ffffff", depthTest: false, transparent: true }));
    this.dark = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#0F181D", depthTest: false, transparent: true }));
    this.light.renderOrder = 11;
    this.dark.renderOrder = 10;
    this.group.add(this.dark, this.light);
    this.group.visible = false;
  }

  show(b: Brick) {
    const p = part(b.part);
    const { w, d } = footprint(p, b.rot);
    const edges = (pad: number) => {
      const box = new THREE.BoxGeometry(w + pad, p.h * PLATE_H + pad, d + pad);
      box.translate(w / 2, (p.h * PLATE_H) / 2, d / 2);
      const e = new THREE.EdgesGeometry(box);
      box.dispose();
      return e;
    };
    this.light.geometry.dispose();
    this.dark.geometry.dispose();
    this.light.geometry = edges(0.04);
    this.dark.geometry = edges(0.1);
    this.group.position.set(b.x, b.y * PLATE_H, b.z);
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  dispose() {
    this.light.geometry.dispose();
    this.dark.geometry.dispose();
  }
}
