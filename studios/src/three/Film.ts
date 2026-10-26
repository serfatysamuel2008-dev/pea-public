// La paire « filmée » : un plateau sombre, un projecteur, une caméra qui suit la paire
// au fil du défilement, l'éclate pièce par pièce puis la réassemble.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { FrameLook } from '../data/products.ts';
import { buildFrame, EXPLODE, PART_ROLE, type FrameModel, type PartName } from './frameModel.ts';

/** Un plan du film : où est la caméra, à quel point la paire est éclatée, quelle pièce est mise en avant. */
export type Shot = {
  at: number;
  /** Caméra en coordonnées sphériques autour de la cible (degrés). */
  az: number;
  el: number;
  dist: number;
  target: [number, number, number];
  /** Rotation propre de la paire (degrés). */
  spin: number;
  explode: number;
  focus: PartName[] | null;
  /** Couleur de la lumière de contre-jour. */
  rim: string;
};

export const SHOTS: Shot[] = [
  { at: 0.0, az: -28, el: 8, dist: 34, target: [0, 0, -3], spin: 0, explode: 0, focus: null, rim: '#6f7a8c' },
  { at: 0.1, az: -18, el: 6, dist: 30, target: [0, 0, -3], spin: 10, explode: 0, focus: null, rim: '#6f7a8c' },
  // Suivi : la caméra glisse vers le pont en trou de serrure.
  { at: 0.2, az: 8, el: 12, dist: 13, target: [0, 1.4, 0], spin: 0, explode: 0, focus: null, rim: '#8a7a62' },
  { at: 0.27, az: 32, el: 4, dist: 16, target: [0.5, 0.8, -1], spin: 0, explode: 0, focus: null, rim: '#8a7a62' },
  // Démontage
  { at: 0.36, az: -32, el: 18, dist: 38, target: [0, 0, -3], spin: -10, explode: 1, focus: null, rim: '#5d6f96' },
  // Analyse pièce par pièce
  { at: 0.44, az: -8, el: 8, dist: 26, target: [0, 0.4, 0], spin: 0, explode: 1, focus: ['face'], rim: '#5d6f96' },
  { at: 0.5, az: -8, el: 8, dist: 26, target: [0, 0.4, 0], spin: 0, explode: 1, focus: ['face'], rim: '#5d6f96' },
  { at: 0.55, az: 24, el: 10, dist: 22, target: [0, 0.2, 3.6], spin: 0, explode: 1, focus: ['lensL', 'lensR'], rim: '#4f7fb8' },
  { at: 0.61, az: 24, el: 10, dist: 22, target: [0, 0.2, 3.6], spin: 0, explode: 1, focus: ['lensL', 'lensR'], rim: '#4f7fb8' },
  { at: 0.66, az: 26, el: 10, dist: 13, target: [7.9, 1.6, -1.4], spin: 0, explode: 1, focus: ['hingeL', 'hingeR'], rim: '#a08a6a' },
  { at: 0.72, az: 26, el: 10, dist: 13, target: [7.9, 1.6, -1.4], spin: 0, explode: 1, focus: ['hingeL', 'hingeR'], rim: '#a08a6a' },
  { at: 0.77, az: 62, el: 38, dist: 38, target: [0, -0.8, -7.5], spin: 0, explode: 1, focus: ['templeL', 'templeR'], rim: '#7a6a8e' },
  { at: 0.82, az: 62, el: 38, dist: 38, target: [0, -0.8, -7.5], spin: 0, explode: 1, focus: ['templeL', 'templeR'], rim: '#7a6a8e' },
  // Réassemblage puis tour de la paire
  { at: 0.89, az: -30, el: 10, dist: 31, target: [0, 0, -3], spin: 0, explode: 0, focus: null, rim: '#6f7a8c' },
  { at: 1.0, az: -30, el: 10, dist: 31, target: [0, 0, -3], spin: 360, explode: 0, focus: null, rim: '#6f7a8c' },
];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = THREE.MathUtils.lerp;
const DEG = Math.PI / 180;
const PARTS: PartName[] = ['face', 'lensL', 'lensR', 'hingeL', 'hingeR', 'templeL', 'templeR'];

export type HudFrame = { rect: { x: number; y: number; w: number; h: number } | null; anchor: { x: number; y: number } | null };

export class GlassesFilm {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
  private model: FrameModel;
  private pivot = new THREE.Group();
  private rim: THREE.DirectionalLight;
  private rim2: THREE.DirectionalLight;
  private target = 0;
  private current = 0;
  private raf = 0;
  private clock = new THREE.Clock();
  private fit = 1;
  private focusLevel: Record<PartName, number> = Object.fromEntries(PARTS.map((p) => [p, 1])) as Record<PartName, number>;
  private pointer = new THREE.Vector2();
  onHud?: (h: HudFrame) => void;
  /** Mode visionneuse : la paire tourne au glisser au lieu de suivre le défilement. */
  private viewer: { rotY: number; rotX: number; vel: number; dragging: boolean; lastX: number; lastY: number } | null = null;

  private lite: boolean;
  private slowFrames = 0;
  private frames = 0;

  constructor(canvas: HTMLCanvasElement, look: FrameLook, opts: { viewer?: boolean } = {}) {
    this.lite = new URLSearchParams(window.location.search).get('qualite') === 'legere';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // Appareils modestes : moins de pixels et des ombres plus légères.
    const small = window.matchMedia('(max-width: 767px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.25 : 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const bg = new THREE.Color('#09090a');
    this.scene.background = bg;
    this.scene.fog = new THREE.Fog(bg, 30, 75);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    pmrem.dispose();

    // Projecteur principal, au-dessus et légèrement devant
    const key = new THREE.SpotLight('#fff6ea', 900, 80, 0.42, 0.75, 1.6);
    key.position.set(4, 26, 14);
    key.target.position.set(0, -2, -3);
    key.castShadow = true;
    key.shadow.mapSize.setScalar(small ? 512 : 1024);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 6;
    this.scene.add(key, key.target);

    this.rim = new THREE.DirectionalLight('#6f7a8c', 2.4);
    this.rim.position.set(-14, 6, -16);
    this.rim2 = new THREE.DirectionalLight('#6f7a8c', 1.6);
    this.rim2.position.set(16, 2, -10);
    const fill = new THREE.HemisphereLight('#c9d2e0', '#0a0a0a', 0.35);
    this.scene.add(this.rim, this.rim2, fill);

    // Sol du plateau : reçoit l'ombre, se perd dans le noir
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(60, 64),
      new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.5, metalness: 0.2 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4.2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.model = buildFrame(look, { lite: this.lite });
    if (this.lite) this.renderer.shadowMap.enabled = false;
    this.pivot.add(this.model.root);
    this.scene.add(this.pivot);

    if (opts.viewer) {
      this.viewer = { rotY: -0.5, rotX: 0.15, vel: 0.004, dragging: false, lastX: 0, lastY: 0 };
      // En visionneuse, la paire tourne autour de son propre centre.
      this.model.root.position.set(0, 0.4, 6.4);
      this.bindViewer(canvas);
    } else {
      // Dans le film, la paire pivote autour de son centre sans changer de place.
      this.pivot.position.set(0, 0, -6.4);
      this.model.root.position.set(0, 0, 6.4);
    }
    window.addEventListener('pointermove', this.onPointer, { passive: true });
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.set(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
  };

  private bindViewer(canvas: HTMLCanvasElement) {
    const v = this.viewer!;
    canvas.addEventListener('pointerdown', (e) => {
      v.dragging = true;
      v.lastX = e.clientX;
      v.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!v.dragging) return;
      v.vel = (e.clientX - v.lastX) * 0.008;
      v.rotY += v.vel;
      v.rotX = THREE.MathUtils.clamp(v.rotX + (e.clientY - v.lastY) * 0.005, -0.5, 0.9);
      v.lastX = e.clientX;
      v.lastY = e.clientY;
    });
    const up = () => (v.dragging = false);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  setLook(look: FrameLook) {
    this.model.setLook(look);
  }

  setProgress(p: number) {
    this.target = THREE.MathUtils.clamp(p, 0, 1);
  }

  /** Saute directement à une position (sans lissage), par exemple au premier affichage. */
  jumpTo(p: number) {
    this.target = this.current = THREE.MathUtils.clamp(p, 0, 1);
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Le texte occupe la gauche (bureau) ou le bas (mobile) : on décale le cadre pour laisser la paire libre.
    if (this.viewer) this.camera.clearViewOffset();
    else if (w >= 768) this.camera.setViewOffset(w, h, -w * 0.16, 0, w, h);
    else this.camera.setViewOffset(w, h, 0, h * 0.16, w, h);
    // En portrait, la caméra recule pour garder la paire entière dans le cadre.
    this.fit = w / h < 1 ? Math.min(2.1, 1.25 / (w / h)) : 1;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.raf) return;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    this.clock.start();
    loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose() {
    this.stop();
    window.removeEventListener('pointermove', this.onPointer);
    this.model.dispose();
    this.renderer.dispose();
  }

  private shotAt(p: number): Shot {
    let i = 0;
    while (i < SHOTS.length - 2 && SHOTS[i + 1].at <= p) i++;
    const a = SHOTS[i];
    const b = SHOTS[i + 1];
    const t = ease(THREE.MathUtils.clamp((p - a.at) / (b.at - a.at), 0, 1));
    return {
      at: p,
      az: lerp(a.az, b.az, t),
      el: lerp(a.el, b.el, t),
      dist: lerp(a.dist, b.dist, t),
      target: [0, 1, 2].map((k) => lerp(a.target[k], b.target[k], t)) as [number, number, number],
      spin: lerp(a.spin, b.spin, t),
      explode: lerp(a.explode, b.explode, t),
      focus: t < 0.5 ? a.focus : b.focus,
      rim: t < 0.5 ? a.rim : b.rim,
    };
  }

  private frame() {
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.05);
    // Qualité adaptative : si l'appareil peine (plus de 45 ms par image), on passe en rendu léger.
    if (!this.lite && ++this.frames > 20) {
      this.slowFrames = raw > 0.045 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
      if (this.slowFrames > 30) {
        this.lite = true;
        this.renderer.shadowMap.enabled = false;
        this.model.setLite(true);
      }
    }
    const time = this.clock.elapsedTime;
    this.current = THREE.MathUtils.damp(this.current, this.target, 5, dt);
    const root = this.model.root;

    if (this.viewer) {
      const v = this.viewer;
      if (!v.dragging) {
        v.vel *= 0.95;
        v.rotY += v.vel + dt * 0.25;
      }
      this.pivot.rotation.y = THREE.MathUtils.damp(this.pivot.rotation.y, v.rotY, 8, dt);
      this.pivot.rotation.x = THREE.MathUtils.damp(this.pivot.rotation.x, v.rotX, 8, dt);
      const d = 31 * this.fit;
      this.camera.position.set(0, 4, d);
      this.camera.lookAt(0, -0.4, 0);
      this.rim.color.set('#6f7a8c');
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const s = this.shotAt(this.current);
    // Paire posée : légère respiration et réaction au curseur, comme une caméra tenue à la main.
    this.pivot.rotation.y = s.spin * DEG + this.pointer.x * 0.12;
    this.pivot.rotation.x = this.pointer.y * 0.05;
    root.position.y = Math.sin(time * 0.8) * 0.12;

    for (const name of PARTS) {
      const part = this.model.parts[name];
      const e = EXPLODE[name];
      const k = ease(s.explode);
      part.position.set(e.pos[0] * k, e.pos[1] * k + (k > 0 ? Math.sin(time * 1.1 + name.length) * 0.08 * k : 0), e.pos[2] * k);
      part.rotation.set(e.rot[0] * k, e.rot[1] * k, e.rot[2] * k);
      // Les pièces hors analyse s'effacent dans l'ombre.
      const want = !s.focus || s.focus.includes(name) ? 1 : 0.12;
      this.focusLevel[name] = THREE.MathUtils.damp(this.focusLevel[name], want, 6, dt);
      this.model.setDim(PART_ROLE[name], this.focusLevel[name]);
    }

    this.rim.color.lerp(new THREE.Color(s.rim), 1 - Math.exp(-dt * 3));
    this.rim2.color.copy(this.rim.color);

    const dist = s.dist * this.fit;
    const az = (s.az + this.pointer.x * 3) * DEG;
    const el = (s.el - this.pointer.y * 2) * DEG;
    const t = new THREE.Vector3(...s.target);
    this.camera.position.set(t.x + dist * Math.sin(az) * Math.cos(el), t.y + dist * Math.sin(el), t.z + dist * Math.cos(az) * Math.cos(el));
    this.camera.lookAt(t);

    this.renderer.render(this.scene, this.camera);
    if (this.onHud) this.onHud(this.hud(s.focus));
  }

  private hud(focus: PartName[] | null): HudFrame {
    if (!focus) return { rect: null, anchor: null };
    const box = new THREE.Box3();
    focus.forEach((n) => box.expandByObject(this.model.parts[n]));
    if (box.isEmpty()) return { rect: null, anchor: null };
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const c = box.getCenter(new THREE.Vector3()).project(this.camera);
    return {
      rect: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      anchor: { x: (c.x * 0.5 + 0.5) * w, y: (-c.y * 0.5 + 0.5) * h },
    };
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
