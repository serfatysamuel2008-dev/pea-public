// Modèle 3D de la monture STUDIOS ROUND 01 : verres ronds, cerclage épais, pont en trou de serrure.
// La face est dessinée par un champ de distance (cercles + pont fusionnés en douceur), puis extrudée :
// on obtient une seule pièce aux raccords arrondis, comme une face en acétate.
// Chaque pièce est un groupe séparé pour pouvoir éclater la paire et l'analyser pièce par pièce.
import * as THREE from 'three';
import type { FrameLook } from '../data/products.ts';

export type PartName = 'face' | 'lensL' | 'lensR' | 'hingeL' | 'hingeR' | 'templeL' | 'templeR';

// Dimensions (unités de scène ≈ cm × 2,2)
const LENS_R = 2.3;
const RIM = 0.5;
const OUTER_R = LENS_R + RIM;
const CX = 3.12;
const DEPTH = 0.5;
const WRAP = 0.011;
const LUG_X = CX + OUTER_R - 0.3;
const HINGE_Y = 1.05;
const TEMPLE_LENGTH = 13.2;

// ---------- Champ de distance de la face ----------

function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function roundedBox(x: number, y: number, cx: number, cy: number, hx: number, hy: number, r: number) {
  const qx = Math.abs(x - cx) - hx + r;
  const qy = Math.abs(y - cy) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function faceSdf(x: number, y: number) {
  const dl = Math.hypot(x + CX, y) - OUTER_R;
  const dr = Math.hypot(x - CX, y) - OUTER_R;
  const rims = smin(dl, dr, 0.3);
  // Pont : une barre plus basse que le haut des cercles, qui laisse deviner deux épaulements.
  const bar = roundedBox(x, y, 0, 1.78, 1.05, 0.34, 0.16);
  let d = smin(rims, bar, 0.28);
  // Arche du trou de serrure sous le pont.
  d = Math.max(d, -(Math.hypot(x, y - 1.08) - 0.46));
  // Logements des verres.
  d = Math.max(d, -(Math.hypot(x + CX, y) - LENS_R));
  d = Math.max(d, -(Math.hypot(x - CX, y) - LENS_R));
  return d;
}

/** Contours (marching squares) de la zone où le champ est négatif. */
function contours(f: (x: number, y: number) => number, x0: number, x1: number, y0: number, y1: number, step: number): THREE.Vector2[][] {
  const nx = Math.ceil((x1 - x0) / step);
  const ny = Math.ceil((y1 - y0) / step);
  const v = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) v[j * (nx + 1) + i] = f(x0 + i * step, y0 + j * step);
  const at = (i: number, j: number) => v[j * (nx + 1) + i];
  // Point sur une arête, identifié de façon unique pour relier les segments.
  const pts = new Map<string, THREE.Vector2>();
  const edgePoint = (i: number, j: number, horizontal: boolean) => {
    const key = `${horizontal ? 'h' : 'v'}${i},${j}`;
    let p = pts.get(key);
    if (!p) {
      const a = at(i, j);
      const b = horizontal ? at(i + 1, j) : at(i, j + 1);
      const t = a / (a - b);
      p = horizontal ? new THREE.Vector2(x0 + (i + t) * step, y0 + j * step) : new THREE.Vector2(x0 + i * step, y0 + (j + t) * step);
      pts.set(key, p);
    }
    return key;
  };
  const next = new Map<string, string>();
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = (at(i, j) < 0 ? 1 : 0) | (at(i + 1, j) < 0 ? 2 : 0) | (at(i + 1, j + 1) < 0 ? 4 : 0) | (at(i, j + 1) < 0 ? 8 : 0);
      if (c === 0 || c === 15) continue;
      const B = () => edgePoint(i, j, true);
      const R = () => edgePoint(i + 1, j, false);
      const T = () => edgePoint(i, j + 1, true);
      const L = () => edgePoint(i, j, false);
      // Segments orientés (intérieur à gauche).
      const segs: [() => string, () => string][] = {
        1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[R, T]], 5: [[L, T], [R, B]], 6: [[B, T]], 7: [[L, T]],
        8: [[T, L]], 9: [[T, B]], 10: [[T, R], [B, L]], 11: [[T, R]], 12: [[R, L]], 13: [[R, B]], 14: [[B, L]],
      }[c] as [() => string, () => string][];
      for (const [a, b] of segs) next.set(a(), b());
    }
  }
  const loops: THREE.Vector2[][] = [];
  const seen = new Set<string>();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop: THREE.Vector2[] = [];
    let k: string | undefined = start;
    while (k && !seen.has(k)) {
      seen.add(k);
      loop.push(pts.get(k)!);
      k = next.get(k);
    }
    if (loop.length > 8) loops.push(loop.filter((_, i) => i % 2 === 0));
  }
  return loops;
}

function faceShape(): THREE.Shape {
  const loops = contours(faceSdf, -7, 7, -3.4, 3.4, 0.025);
  const area = (l: THREE.Vector2[]) => THREE.ShapeUtils.area(l);
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const [outer, ...holes] = loops;
  const shape = new THREE.Shape(THREE.ShapeUtils.isClockWise(outer) ? [...outer].reverse() : outer);
  for (const h of holes) shape.holes.push(new THREE.Path(THREE.ShapeUtils.isClockWise(h) ? h : [...h].reverse()));
  return shape;
}

function bend(geo: THREE.BufferGeometry) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) - WRAP * pos.getX(i) ** 2);
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ---------- Branches : profil balayé le long d'un chemin ----------

function templeGeometry(): THREE.BufferGeometry {
  const path = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -4),
      new THREE.Vector3(0, -0.12, -9.5),
      new THREE.Vector3(0, -0.45, -TEMPLE_LENGTH + 1.2),
      new THREE.Vector3(0, -1.25, -TEMPLE_LENGTH),
      new THREE.Vector3(0, -2.2, -TEMPLE_LENGTH - 0.4),
    ],
    false,
    'centripetal',
  );
  const steps = 160;
  const seg = 6;
  const profile = (w: number, h: number) => {
    const r = Math.min(w, h) * 0.42;
    const out: THREE.Vector2[] = [];
    const corners: [number, number, number][] = [
      [w / 2 - r, h / 2 - r, 0],
      [-w / 2 + r, h / 2 - r, Math.PI / 2],
      [-w / 2 + r, -h / 2 + r, Math.PI],
      [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
    ];
    for (const [cx, cy, a0] of corners) for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      out.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    return out;
  };
  const side = new THREE.Vector3(1, 0, 0);
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const m = (seg + 1) * 4;
  const len = path.getLength();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const p = path.getPointAt(u);
    const tan = path.getTangentAt(u);
    const up = new THREE.Vector3().crossVectors(tan, side).normalize().negate();
    // Large à la charnière, plus fine vers l'oreille, embout légèrement renflé.
    const h = THREE.MathUtils.lerp(0.78, 0.42, Math.min(1, u * 1.3)) + (u > 0.9 ? (u - 0.9) * 1.2 : 0);
    const w = THREE.MathUtils.lerp(0.34, 0.26, u);
    for (const q of profile(w, h)) {
      positions.push(p.x + side.x * q.x + up.x * q.y, p.y + side.y * q.x + up.y * q.y, p.z + side.z * q.x + up.z * q.y);
      uvs.push(u * len * 0.5, (q.y + q.x) * 2);
    }
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < m; j++) {
    const a = i * m + j;
    const b = i * m + ((j + 1) % m);
    index.push(a, a + m, b, b, a + m, b + m);
  }
  const cap = (ring: number, center: THREE.Vector3, flip: boolean) => {
    const c = positions.length / 3;
    positions.push(center.x, center.y, center.z);
    uvs.push(0, 0);
    for (let j = 0; j < m; j++) {
      const a = ring * m + j;
      const b = ring * m + ((j + 1) % m);
      if (flip) index.push(c, b, a);
      else index.push(c, a, b);
    }
  };
  cap(0, path.getPointAt(0), true);
  cap(steps, path.getPointAt(1), false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function lensGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(LENS_R + 0.12, 96, 0, Math.PI * 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i)) / (LENS_R + 0.12);
    pos.setZ(i, 0.16 * (1 - r * r));
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- Matières ----------

const texCache = new Map<string, THREE.Texture>();

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvasTexture(key: string, draw: (ctx: CanvasRenderingContext2D, size: number) => void, colorSpace = true) {
  const cached = texCache.get(key);
  if (cached) return cached;
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (colorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

/** Dessine des formes sur un calque net puis le pose flouté en une seule opération (rapide). */
function blurredLayer(ctx: CanvasRenderingContext2D, size: number, blur: number, draw: (layer: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const l = c.getContext('2d')!;
  draw(l);
  ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
  ctx.drawImage(c, 0, 0);
  ctx.filter = 'none';
}

/** Écaille : taches allongées, floues, de plusieurs tons. */
function tortoiseTexture(base: string, spots: string[]) {
  return canvasTexture(`t${base}${spots.join()}`, (ctx, size) => {
    const rnd = seeded(11);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    // Grandes nappes floues, puis grains plus fins et plus nets.
    const passes = [...spots.map((c) => ({ c, n: 90, r: [8, 26], blur: 7 })), ...spots.map((c) => ({ c, n: 160, r: [3, 10], blur: 2.5 }))];
    for (const { c: color, n, r: [r0, r1], blur } of passes) {
      blurredLayer(ctx, size, blur, (l) => {
        l.fillStyle = color;
        l.globalAlpha = 0.85;
        for (let i = 0; i < n; i++) {
          const x = rnd() * size;
          const y = rnd() * size;
          const r = r0 + rnd() * (r1 - r0);
          const rx = r * (1.2 + rnd() * 1.6);
          const ry = r * 0.6;
          const rot = rnd() * 0.6 - 0.3;
          l.beginPath();
          l.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
          l.fill();
        }
      });
    }
  });
}

/** Marbre : veines sombres et diffuses sur fond cristal. */
function marbleTexture(base: string, vein: string) {
  return canvasTexture(`m${base}${vein}`, (ctx, size) => {
    const rnd = seeded(5);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (const blur of [12, 4]) {
      blurredLayer(ctx, size, blur, (l) => {
        l.strokeStyle = vein;
        l.lineCap = 'round';
        for (let i = 0; i < 13; i++) {
          l.globalAlpha = 0.35 + rnd() * 0.5;
          l.lineWidth = (blur > 6 ? 18 : 6) + rnd() * 30;
          l.beginPath();
          let x = rnd() * size;
          let y = rnd() * size;
          l.moveTo(x, y);
          for (let k = 0; k < 6; k++) {
            x += (rnd() - 0.5) * 300;
            y += (rnd() - 0.3) * 220;
            l.lineTo(x, y);
          }
          l.stroke();
        }
      });
    }
  });
}

/** Dégradé vertical sur la face (haut → bas). */
function gradientTexture(top: string, bottom: string) {
  return canvasTexture(`g${top}${bottom}`, (ctx, size) => {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, bottom);
    g.addColorStop(0.32, bottom);
    g.addColorStop(0.62, top);
    g.addColorStop(1, top);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}

function gradientMask(invert = false) {
  return canvasTexture(
    invert ? 'gmi' : 'gm',
    (ctx, size) => {
      if (invert) {
        const g = ctx.createLinearGradient(0, 0, 0, size);
        g.addColorStop(0, '#333333');
        g.addColorStop(0.32, '#333333');
        g.addColorStop(0.62, '#ffffff');
        g.addColorStop(1, '#ffffff');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        return;
      }
      const g = ctx.createLinearGradient(0, 0, 0, size);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.32, '#ffffff');
      g.addColorStop(0.62, '#000000');
      g.addColorStop(1, '#000000');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    },
    false,
  );
}

/** Les UV de la face sont ses coordonnées (x, y) : on les ramène dans [0, 1]. */
function fitFace(tex: THREE.Texture) {
  const t = tex.clone();
  t.repeat.set(1 / 7.2, 1 / 7.2);
  t.offset.set(0.5, 0.5);
  t.needsUpdate = true;
  return t;
}

function acetate(kind: FrameLook['kind'] | 'solid' | 'translucent' | 'tortoise', look: { color: string; spots?: string[]; to?: string }, onFace: boolean, lite = false) {
  const common = { clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 };
  // Mode léger : transparence simple au lieu de la réfraction (bien plus rapide à calculer).
  const glass = (transmission: number, thickness: number) =>
    lite ? { transparent: true, opacity: 0.55 + 0.4 * (1 - transmission) } : { transmission, thickness, ior: 1.49 };
  switch (kind) {
    case 'tortoise': {
      const map = tortoiseTexture(look.color, look.spots ?? []);
      return new THREE.MeshPhysicalMaterial({ ...common, map: onFace ? fitFace(map) : map, roughness: 0.22 });
    }
    case 'marble': {
      const map = fitFace(marbleTexture(look.color, look.spots?.[0] ?? '#111'));
      return new THREE.MeshPhysicalMaterial({ ...common, map, roughness: 0.12, ...glass(0.55, 0.8) });
    }
    case 'gradient': {
      return new THREE.MeshPhysicalMaterial({
        ...common,
        map: fitFace(gradientTexture(look.color, look.to ?? '#ffffff')),
        ...(lite ? { transparent: true, alphaMap: fitFace(gradientMask(true)), opacity: 1 } : { transmission: 1, transmissionMap: fitFace(gradientMask()), thickness: 0.9, ior: 1.49 }),
        roughness: 0.1,
      });
    }
    case 'translucent':
      return new THREE.MeshPhysicalMaterial({
        ...common,
        color: look.color,
        ...glass(0.88, 1.1),
        roughness: 0.12,
        attenuationColor: new THREE.Color(look.color),
        attenuationDistance: 1.4,
      });
    default:
      return new THREE.MeshPhysicalMaterial({ ...common, color: look.color, roughness: 0.16 });
  }
}

// ---------- Assemblage ----------

export type Role = 'face' | 'temple' | 'lens' | 'metal';

export const PART_ROLE: Record<PartName, Role> = {
  face: 'face', lensL: 'lens', lensR: 'lens', hingeL: 'metal', hingeR: 'metal', templeL: 'temple', templeR: 'temple',
};

export type FrameModel = {
  root: THREE.Group;
  parts: Record<PartName, THREE.Group>;
  setLook: (look: FrameLook) => void;
  /** Plonge une matière dans l'ombre (0) ou la remet en pleine lumière (1). */
  setDim: (role: Role, level: number) => void;
  /** Bascule en rendu léger (sans réfraction) sur les appareils qui peinent. */
  setLite: (on: boolean) => void;
  dispose: () => void;
};

export function buildFrame(look: FrameLook, opts: { lite?: boolean } = {}): FrameModel {
  let lite = !!opts.lite;
  const root = new THREE.Group();
  const parts = {} as Record<PartName, THREE.Group>;
  (['face', 'lensL', 'lensR', 'hingeL', 'hingeR', 'templeL', 'templeR'] as PartName[]).forEach((n) => {
    const g = new THREE.Group();
    g.name = n;
    parts[n] = g;
    root.add(g);
  });

  const geos: THREE.BufferGeometry[] = [];
  const keep = (g: THREE.BufferGeometry) => (geos.push(g), g);
  const meshes: { mesh: THREE.Mesh; role: 'face' | 'temple' | 'lens' | 'metal' }[] = [];
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, role: 'face' | 'temple' | 'lens' | 'metal') => {
    const mesh = new THREE.Mesh(keep(geo), undefined);
    mesh.castShadow = role !== 'lens';
    mesh.receiveShadow = true;
    parent.add(mesh);
    meshes.push({ mesh, role });
    return mesh;
  };

  // Face d'un seul tenant
  const faceGeo = new THREE.ExtrudeGeometry(faceShape(), { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.12, bevelSegments: 6, curveSegments: 4 });
  faceGeo.translate(0, 0, -DEPTH / 2);
  bend(faceGeo);
  add(parts.face, faceGeo, 'face');

  // Plaquettes intégrées (bas intérieur des cercles)
  for (const s of [-1, 1]) {
    const pad = add(parts.face, new THREE.SphereGeometry(0.5, 24, 16), 'face');
    pad.scale.set(0.42, 0.9, 0.62);
    pad.position.set(s * (CX - LENS_R * 0.78), -LENS_R * 0.5, -0.45 - WRAP * (CX - LENS_R) ** 2);
    pad.rotation.z = s * 0.45;
  }

  // Tenons (prolongements de la face où s'articulent les branches)
  for (const s of [-1, 1]) {
    const lug = add(parts.face, new THREE.BoxGeometry(0.62, 0.86, 1.0, 2, 2, 2), 'face');
    const pos = lug.geometry.attributes.position as THREE.BufferAttribute;
    // Arrondit la boîte.
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const n = v.clone().multiply(new THREE.Vector3(1 / 0.31, 1 / 0.43, 1 / 0.5));
      const k = 1 - 0.12 * Math.max(0, n.length() - 1.2);
      pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
    }
    lug.geometry.computeVertexNormals();
    lug.position.set(s * LUG_X, HINGE_Y, -0.55 - WRAP * LUG_X ** 2);
  }

  // Verres
  for (const [name, s] of [['lensL', -1], ['lensR', 1]] as const) {
    const lens = add(parts[name], lensGeometry(), 'lens');
    lens.position.set(s * CX, 0, 0.02 - WRAP * CX ** 2);
    lens.renderOrder = 2;
  }

  // Charnières : trois charnons métalliques et deux rivets apparents
  for (const [name, s] of [['hingeL', -1], ['hingeR', 1]] as const) {
    const z = -1.08 - WRAP * LUG_X ** 2;
    for (let i = 0; i < 3; i++) {
      const knuckle = add(parts[name], new THREE.CylinderGeometry(0.11, 0.11, 0.2, 20), 'metal');
      knuckle.position.set(s * (LUG_X + 0.08), HINGE_Y - 0.22 + i * 0.22, z);
    }
    for (const dz of [-0.25, -0.55]) {
      const rivet = add(parts[name], new THREE.CylinderGeometry(0.075, 0.075, 0.08, 20), 'metal');
      rivet.rotation.z = Math.PI / 2;
      rivet.position.set(s * (LUG_X + 0.32), HINGE_Y, dz - WRAP * LUG_X ** 2);
    }
  }

  // Branches
  for (const [name, s] of [['templeL', -1], ['templeR', 1]] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(s * (LUG_X + 0.06), HINGE_Y, -1.12 - WRAP * LUG_X ** 2);
    pivot.rotation.y = -s * 0.06;
    parts[name].add(pivot);
    add(pivot, templeGeometry(), 'temple');
  }

  const materials: THREE.MeshPhysicalMaterial[] = [];
  const metal = new THREE.MeshPhysicalMaterial({ color: '#c9ccd1', metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });
  let byRole = {} as Record<Role, THREE.MeshPhysicalMaterial>;
  let current = look;
  const setDim = (role: Role, level: number) => {
    const m = byRole[role];
    if (!m) return;
    const b = m.userData.base as { color: THREE.Color; env: number; opacity: number };
    const k = 0.08 + 0.92 * level;
    m.color.copy(b.color).multiplyScalar(k);
    m.envMapIntensity = b.env * (0.2 + 0.8 * level);
    if (role === 'lens') m.opacity = b.opacity * (0.3 + 0.7 * level);
  };
  const setLook = (l: FrameLook) => {
    materials.forEach((m) => m !== metal && m.dispose());
    materials.length = 0;
    current = l;
    const face = acetate(l.kind, l, true, lite);
    const temple = l.temple ? acetate(l.temple.kind, l.temple, false, lite) : l.kind === 'marble' || l.kind === 'gradient' ? acetate('solid', l, false, lite) : acetate(l.kind, l, false, lite);
    const lens = new THREE.MeshPhysicalMaterial({
      color: l.lens,
      transparent: true,
      opacity: l.lensOpacity,
      roughness: 0.04,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    materials.push(face, temple, lens, metal);
    byRole = { face, temple, lens, metal };
    for (const m of materials) m.userData.base = { color: m.color.clone(), env: m.envMapIntensity, opacity: m.opacity };
    for (const { mesh, role } of meshes) mesh.material = role === 'face' ? face : role === 'temple' ? temple : role === 'lens' ? lens : metal;
  };
  setLook(look);

  return {
    root,
    parts,
    setLook,
    setDim,
    setLite: (on: boolean) => {
      if (on === lite) return;
      lite = on;
      setLook(current);
    },
    dispose: () => {
      geos.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

/** Position de chaque pièce quand la paire est éclatée (décalage depuis sa place). */
export const EXPLODE: Record<PartName, { pos: [number, number, number]; rot: [number, number, number] }> = {
  face: { pos: [0, 0.4, 0], rot: [0, 0, 0] },
  lensL: { pos: [-1.2, 0.2, 3.6], rot: [0, 0.35, 0] },
  lensR: { pos: [1.2, 0.2, 3.6], rot: [0, -0.35, 0] },
  hingeL: { pos: [-2.4, 0.6, -0.4], rot: [0, 0, 0] },
  hingeR: { pos: [2.4, 0.6, -0.4], rot: [0, 0, 0] },
  templeL: { pos: [-4.2, -0.6, -1.6], rot: [0, -0.25, 0] },
  templeR: { pos: [4.2, -0.6, -1.6], rot: [0, 0.25, 0] },
};
