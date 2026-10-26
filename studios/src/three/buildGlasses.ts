// Génère une paire de lunettes en 3D à partir de sa fiche (FrameSpec).
// Une seule source pour la scène du hero, la visionneuse 360° et les packshots (scripts/render).
import * as THREE from 'three';
import type { FrameSpec, LensShape } from '../data/products.ts';

type V2 = THREE.Vector2;
const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

const SAMPLES = 120;

/** Contour d'un verre centré sur l'origine. Le côté nez est vers -x, le côté tempe vers +x. */
function lensOutline(shape: LensShape, w: number, h: number): V2[] {
  const a = w / 2;
  const b = h / 2;
  const pts: V2[] = [];
  const superellipse = (n: number, t: number) => {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return v2(a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(s) * Math.abs(s) ** (2 / n));
  };

  if (shape === 'hex') {
    // Hexagone à coins légèrement arrondis.
    const poly: V2[] = [];
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2;
      poly.push(v2(a * Math.cos(t), b * Math.sin(t) * 1.12));
    }
    const path = new THREE.Shape();
    const k = 0.14;
    poly.forEach((p, i) => {
      const prev = poly[(i + 5) % 6];
      const next = poly[(i + 1) % 6];
      const from = p.clone().lerp(prev, k);
      const to = p.clone().lerp(next, k);
      if (i === 0) path.moveTo(from.x, from.y);
      else path.lineTo(from.x, from.y);
      path.quadraticCurveTo(p.x, p.y, to.x, to.y);
    });
    path.closePath();
    return path.getSpacedPoints(SAMPLES).slice(0, SAMPLES);
  }

  for (let i = 0; i < SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    let p: V2;
    switch (shape) {
      case 'rect':
        p = superellipse(5.5, t);
        break;
      case 'square':
        p = superellipse(4.2, t);
        break;
      case 'round':
        p = superellipse(2, t);
        break;
      case 'oval':
        p = superellipse(2.3, t);
        break;
      case 'wayfarer': {
        p = superellipse(3.6, t);
        // Trapèze : plus large en haut, coin supérieur extérieur relevé.
        p.x *= 1 + 0.1 * (p.y / b);
        if (p.y > 0 && p.x > 0) p.y += 0.12 * b * (p.x / a) ** 2;
        break;
      }
      case 'aviator': {
        // Goutte d'eau : haut presque droit, point bas décalé vers le nez.
        p = superellipse(2.3, t);
        if (p.y > 0) p.y *= 0.7;
        else p.y *= 1 + 0.2 * (-p.x / a) - 0.06 * Math.max(0, p.x / a);
        if (p.y < 0) p.x -= 0.08 * a * (-p.y / b) * (1 - Math.abs(p.x / a));
        p.y += b * 0.14;
        break;
      }
      case 'cat': {
        // Coin supérieur extérieur étiré en pointe.
        p = superellipse(2.4, t);
        p = pullToward(p, v2(a * 1.1, b * 1.3), angularWeight(t, 0.68, 0.55) * 0.62);
        if (p.y < 0) p.y *= 0.86;
        break;
      }
      case 'butterfly': {
        p = superellipse(2.8, t);
        p = pullToward(p, v2(a * 1.1, b * 1.1), angularWeight(t, 0.7, 0.5) * 0.5);
        if (p.y < 0) p.y *= 1 + 0.12 * (p.x / a);
        if (p.y < 0 && p.x < 0) p.x *= 0.92;
        break;
      }
      case 'wrap': {
        p = superellipse(3.2, t);
        if (p.y > 0) p.y *= 0.82;
        if (p.x > 0) p.y *= 1 - 0.28 * (p.x / a);
        break;
      }
      case 'shield': {
        p = superellipse(3, t);
        if (p.y > 0) p.y *= 0.78;
        // Encoche du nez au centre du bas.
        if (p.y < 0) p.y *= 1 - 0.5 * Math.exp(-((p.x / (0.13 * a)) ** 2));
        break;
      }
      default:
        p = superellipse(2, t);
    }
    pts.push(p);
  }
  return pts;
}

/** Poids gaussien autour d'un angle (en radians) du contour. */
function angularWeight(t: number, center: number, width: number) {
  return Math.exp(-(((t - center) / width) ** 2));
}

function pullToward(p: V2, target: V2, k: number): V2 {
  return v2(p.x + (target.x - p.x) * k, p.y + (target.y - p.y) * k);
}

/** Décale un contour fermé vers l'extérieur. */
function offset(pts: V2[], d: number): V2[] {
  const n = pts.length;
  const c = centroid(pts);
  return pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const tan = next.clone().sub(prev).normalize();
    const nrm = v2(tan.y, -tan.x);
    if (nrm.dot(p.clone().sub(c)) < 0) nrm.multiplyScalar(-1);
    return p.clone().add(nrm.multiplyScalar(d));
  });
}

function centroid(pts: V2[]): V2 {
  const c = v2(0, 0);
  pts.forEach((p) => c.add(p));
  return c.multiplyScalar(1 / pts.length);
}

function isClockwise(pts: V2[]) {
  return THREE.ShapeUtils.isClockWise(pts);
}

function ccw(pts: V2[]) {
  return isClockwise(pts) ? [...pts].reverse() : pts;
}

const translate = (pts: V2[], dx: number, dy = 0) => pts.map((p) => v2(p.x + dx, p.y + dy));
const mirror = (pts: V2[]) => ccw(pts.map((p) => v2(-p.x, p.y)));

/** Cambrure générale de la face (les lunettes épousent le visage). */
function wrapZ(x: number, curvature: number) {
  return -curvature * x * x;
}

function bendGeometry(geo: THREE.BufferGeometry, curvature: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) + wrapZ(pos.getX(i), curvature));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/** Texture écaille procédurale (déterministe). */
let tortoiseTexture: THREE.CanvasTexture | null = null;
function getTortoiseTexture(): THREE.Texture {
  if (tortoiseTexture) return tortoiseTexture;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  ctx.fillStyle = '#b8742c';
  ctx.fillRect(0, 0, size, size);
  const blob = (color: string, count: number, rMin: number, rMax: number, blur: number) => {
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = rMin + rnd() * (rMax - rMin);
      for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, r * (0.6 + rnd()), r, rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  blob('#8a4a16', 26, 40, 90, 22);
  blob('#5a2a0a', 34, 22, 60, 16);
  blob('#2c1204', 30, 14, 40, 12);
  blob('rgba(20,8,0,0.85)', 18, 8, 22, 9);
  blob('rgba(255,190,100,0.45)', 22, 16, 40, 18);
  ctx.filter = 'none';
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.16, 0.16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tortoiseTexture = tex;
  return tex;
}

function frameMaterial(spec: FrameSpec): THREE.Material {
  const color = new THREE.Color(spec.frame);
  switch (spec.finish) {
    case 'metal':
      return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.18, envMapIntensity: 1.6 });
    case 'matte':
      return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.6 });
    case 'tortoise':
      return new THREE.MeshPhysicalMaterial({
        map: getTortoiseTexture(), metalness: 0, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08,
      });
    case 'clear':
      return new THREE.MeshPhysicalMaterial({
        color, metalness: 0, roughness: 0.04, transparent: true, opacity: color.getHSL({ h: 0, s: 0, l: 0 }).s > 0.4 ? 0.66 : 0.42, clearcoat: 1,
        clearcoatRoughness: 0.02, envMapIntensity: 2.4, depthWrite: false, side: THREE.DoubleSide,
      });
    default:
      return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 });
  }
}

function lensMaterial(spec: FrameSpec): THREE.Material {
  const m = spec.lens;
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    transparent: true,
    opacity: m.opacity,
    metalness: m.mirror ? 0.85 : 0.1,
    roughness: m.mirror ? 0.06 : 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    iridescence: m.mirror ? 1 : 0.15,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [180, 780],
    envMapIntensity: m.mirror ? 2.2 : 1.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** Maillage d'un verre : grille polaire (pour pouvoir le bomber), dégradé haut → bas en couleurs de sommets. */
function lensGeometry(outline: V2[], spec: FrameSpec, curvature: number, z: number): THREE.BufferGeometry {
  const rings = 18;
  const c = centroid(outline);
  const n = outline.length;
  let minY = Infinity;
  let maxY = -Infinity;
  outline.forEach((p) => {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  const top = new THREE.Color(spec.lens.top);
  const bottom = new THREE.Color(spec.lens.bottom);
  const positions: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  outline.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  });
  const white = new THREE.Color('#ffffff');
  const push = (x: number, y: number, r: number) => {
    const bulge = 0.22 * (1 - r * r);
    positions.push(x, y, z + bulge + wrapZ(x, curvature));
    const t = THREE.MathUtils.clamp((y - minY) / (maxY - minY), 0, 1);
    const u = (x - minX) / (maxX - minX);
    const col = bottom.clone().lerp(top, THREE.MathUtils.smoothstep(t, 0.15, 0.85));
    // Reflet de studio : bande diagonale douce dans le haut du verre.
    const d = u * 0.55 + t - 1.05;
    const glare = Math.exp(-((d / 0.13) ** 2)) * 0.26 + Math.exp(-(((d - 0.26) / 0.06) ** 2)) * 0.1;
    col.lerp(white, glare * (spec.lens.mirror ? 0.5 : 1));
    colors.push(col.r, col.g, col.b);
  };
  push(c.x, c.y, 0);
  for (let r = 1; r <= rings; r++) {
    const k = r / rings;
    for (let i = 0; i < n; i++) {
      const p = outline[i];
      push(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k, k);
    }
  }
  for (let i = 0; i < n; i++) index.push(0, 1 + i, 1 + ((i + 1) % n));
  for (let r = 1; r < rings; r++) {
    const a0 = 1 + (r - 1) * n;
    const b0 = 1 + r * n;
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      index.push(a0 + i, b0 + i, b0 + i2, a0 + i, b0 + i2, a0 + i2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function rimGeometry(lens: V2[], spec: FrameSpec, depth: number): THREE.BufferGeometry {
  const t = spec.thickness;
  const shape = new THREE.Shape(ccw(offset(lens, t)));
  shape.holes.push(new THREE.Path([...ccw(lens)].reverse()));
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: Math.min(0.14, t * 0.35),
    bevelSize: Math.min(0.12, t * 0.28),
    bevelSegments: 4,
    curveSegments: 4,
  });
}

function wireGeometry(lens: V2[], spec: FrameSpec, z: number): THREE.BufferGeometry {
  const pts = offset(lens, spec.thickness * 0.5).map((p) => new THREE.Vector3(p.x, p.y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return new THREE.TubeGeometry(curve, 220, spec.thickness * 0.55, 10, true);
}

/** Balaye un profil 2D le long d'un chemin situé dans le plan y-z (repère stable, sans torsion). */
function sweep(path: THREE.Curve<THREE.Vector3>, profile: V2[], steps: number): THREE.BufferGeometry {
  const side = new THREE.Vector3(1, 0, 0);
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const m = profile.length;
  const len = path.getLength();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const p = path.getPointAt(u);
    const tan = path.getTangentAt(u);
    const up = new THREE.Vector3().crossVectors(tan, side).normalize().negate();
    for (const q of profile) {
      positions.push(p.x + side.x * q.x + up.x * q.y, p.y + side.y * q.x + up.y * q.y, p.z + side.z * q.x + up.z * q.y);
      uvs.push(u * len, q.y * 3 + q.x);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < m; j++) {
      const a0 = i * m + j;
      const a1 = i * m + ((j + 1) % m);
      const b0 = a0 + m;
      const b1 = a1 + m;
      index.push(a0, b0, a1, a1, b0, b1);
    }
  }
  // Bouchons aux extrémités.
  const capStart = positions.length / 3;
  const p0 = path.getPointAt(0);
  const p1 = path.getPointAt(1);
  positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
  uvs.push(0, 0, len, 0);
  for (let j = 0; j < m; j++) {
    const j2 = (j + 1) % m;
    index.push(capStart, j2, j);
    index.push(capStart + 1, steps * m + j, steps * m + j2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function roundedRect(w: number, h: number, r: number, seg = 5): V2[] {
  const pts: V2[] = [];
  const corners = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= seg; i++) {
      const t = start + (i / seg) * (Math.PI / 2);
      pts.push(v2(cx + r * Math.cos(t), cy + r * Math.sin(t)));
    }
  }
  return pts;
}

/** Longueur d'une branche (de la charnière à la courbure de l'oreille). */
const TEMPLE_LENGTH = 12.5;

function templePath(from = 0) {
  const pts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -3),
    new THREE.Vector3(0, -0.12, -8.2),
    new THREE.Vector3(0, -0.5, -TEMPLE_LENGTH + 1.4),
    new THREE.Vector3(0, -1.1, -TEMPLE_LENGTH),
    new THREE.Vector3(0, -1.9, -TEMPLE_LENGTH - 0.45),
  ];
  return new THREE.CatmullRomCurve3(pts.slice(from), false, 'centripetal');
}

function templeGeometry(spec: FrameSpec): THREE.BufferGeometry {
  if (spec.finish === 'metal') return new THREE.TubeGeometry(templePath(), 120, 0.09, 8, false);
  const w = spec.shape === 'wrap' ? 0.26 : 0.22;
  const h = THREE.MathUtils.clamp(spec.thickness * 0.9, 0.34, 0.7);
  return sweep(templePath(), roundedRect(w, h, w * 0.45), 140);
}

export type GlassesModel = {
  group: THREE.Group;
  /** Largeur totale de la face, utile pour cadrer la caméra. */
  width: number;
  dispose: () => void;
};

export function buildGlasses(spec: FrameSpec): GlassesModel {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D = group) => {
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    parent.add(mesh);
    return mesh;
  };

  const fMat = frameMaterial(spec);
  const lMat = lensMaterial(spec);
  const metal = spec.finish === 'metal';
  const depth = metal ? 0 : 0.42;
  const curvature = spec.shape === 'wrap' ? 0.032 : spec.shape === 'shield' ? 0.026 : 0.012;
  const t = spec.thickness;
  const a = spec.lensW / 2;
  const b = spec.lensH / 2;
  const single = spec.shape === 'shield';

  const base = ccw(lensOutline(spec.shape, spec.lensW, spec.lensH));
  const cx = single ? 0 : spec.bridge / 2 + a;
  const lenses = single ? [base] : [translate(base, cx), translate(mirror(base), -cx)];
  const lensZ = metal ? 0 : depth * 0.5;

  for (const lens of lenses) {
    if (metal) {
      const g = wireGeometry(lens, spec, 0);
      bendGeometry(g, curvature);
      add(g, fMat);
    } else {
      const g = rimGeometry(lens, spec, depth);
      bendGeometry(g, curvature);
      add(g, fMat);
    }
    add(lensGeometry(lens, spec, curvature, lensZ), lMat).renderOrder = 2;
  }

  // Pont.
  if (!single) {
    const y0 = b * 0.38;
    const half = spec.bridge / 2 + t * 0.4;
    if (metal) {
      const bridge = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-half, y0, 0),
        new THREE.Vector3(0, y0 + b * 0.32, 0.25),
        new THREE.Vector3(half, y0, 0),
      );
      add(new THREE.TubeGeometry(bridge, 40, t * 0.5, 8, false), fMat);
      if (spec.doubleBridge) {
        const yTop = b * 0.84 + b * 0.12;
        const bar = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-cx - a * 0.2, yTop - 0.05, wrapZ(-cx, curvature)),
          new THREE.Vector3(0, yTop + 0.08, 0.05),
          new THREE.Vector3(cx + a * 0.2, yTop - 0.05, wrapZ(cx, curvature)),
        ]);
        add(new THREE.TubeGeometry(bar, 60, t * 0.45, 8, false), fMat);
      }
      // Plaquettes de nez.
      const padMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, roughness: 0.1, clearcoat: 1 });
      for (const s of [-1, 1]) {
        const pad = add(new THREE.SphereGeometry(0.42, 16, 12), padMat);
        pad.scale.set(0.35, 0.85, 0.25);
        pad.position.set(s * (spec.bridge / 2 + 0.35), -b * 0.25, -0.75);
        pad.rotation.z = s * 0.25;
      }
    } else {
      const hgt = Math.max(0.5, t * 1.05);
      const shape = new THREE.Shape();
      shape.moveTo(-half, y0 + hgt / 2);
      shape.quadraticCurveTo(0, y0 + hgt / 2 + 0.12, half, y0 + hgt / 2);
      shape.lineTo(half, y0 - hgt / 2);
      shape.quadraticCurveTo(0, y0 - hgt / 2 + hgt * 0.7, -half, y0 - hgt / 2);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: depth - 0.04, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.06, bevelSegments: 3,
      });
      g.translate(0, 0, 0.02);
      add(g, fMat);
    }
  }

  // Charnières et branches.
  const edgeX = single ? a + t : cx + a + t * 0.6;
  const hingeY = single ? b * 0.35 : b * 0.42;
  const hingeZ = wrapZ(edgeX, curvature);
  for (const s of [-1, 1]) {
    const x = s * edgeX;
    if (!metal) {
      const endPiece = add(new THREE.BoxGeometry(t * 0.9 + 0.15, Math.max(0.55, t * 1.1), depth + 0.6), fMat);
      endPiece.position.set(x, hingeY, hingeZ - 0.18);
    } else {
      const endPiece = add(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 12), fMat);
      endPiece.position.set(x, hingeY, hingeZ - 0.05);
    }
    const temple = new THREE.Group();
    temple.position.set(x, hingeY, hingeZ - 0.45);
    temple.rotation.y = -s * 0.07;
    group.add(temple);
    add(templeGeometry(spec), fMat, temple);
    if (metal) {
      // Embout d'acétate en bout de branche.
      const tipMat = new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.3, clearcoat: 1 });
      add(new THREE.TubeGeometry(templePath(2), 60, 0.15, 10, false), tipMat, temple);
    }
  }

  // Centre la face sur l'origine (la scène tourne autour du centre de la face).
  group.position.z = 0;
  const width = 2 * edgeX;

  return {
    group,
    width,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      fMat.dispose();
      lMat.dispose();
    },
  };
}

export const VIEW_ROTATIONS = {
  front: new THREE.Euler(0.04, 0, 0),
  'three-quarter': new THREE.Euler(0.12, -0.62, 0.02),
  side: new THREE.Euler(0.05, -1.42, 0),
  top: new THREE.Euler(0.72, -0.28, 0.05),
} as const;
