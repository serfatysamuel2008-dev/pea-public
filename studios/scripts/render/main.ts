// Page outil (non publiée) : rend les packshots de chaque modèle avec le générateur 3D.
// Utilisée par scripts/render/run.mjs (Playwright), ou ouverte à la main sur /render.html.
import * as THREE from 'three';
import { PRODUCTS, VIEWS, type View } from '../../src/data/products.ts';
import { buildGlasses, VIEW_ROTATIONS } from '../../src/three/buildGlasses.ts';
import { addStudioLights, frameObject, studioEnvironment } from '../../src/three/stage.ts';

const W = 1600;
const H = 1200;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

function renderView(slug: string, view: View): { lg: string; sm: string } {
  const product = PRODUCTS.find((p) => p.slug === slug)!;
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  addStudioLights(scene);
  const model = buildGlasses(product.spec);
  const holder = new THREE.Group();
  holder.add(model.group);
  holder.rotation.copy(VIEW_ROTATIONS[view]);
  scene.add(holder);
  const camera = new THREE.PerspectiveCamera(16, W / H, 0.1, 1000);
  frameObject(camera, holder, view === 'front' ? 0.86 : 0.8);
  renderer.render(scene, camera);
  const lg = renderer.domElement.toDataURL('image/webp', 0.9);
  const small = document.createElement('canvas');
  small.width = W / 2;
  small.height = H / 2;
  const ctx = small.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(renderer.domElement, 0, 0, W / 2, H / 2);
  const sm = small.toDataURL('image/webp', 0.88);
  model.dispose();
  return { lg, sm };
}

declare global {
  interface Window {
    renderAll: (only?: string[]) => Promise<Record<string, string>>;
  }
}

window.renderAll = async (only) => {
  const out: Record<string, string> = {};
  const list = PRODUCTS.filter((p) => !only || only.includes(p.slug));
  for (const p of list) {
    for (const view of VIEWS) {
      const { lg, sm } = renderView(p.slug, view);
      out[`${p.slug}-${view}`] = lg;
      out[`${p.slug}-${view}-sm`] = sm;
      const img = document.createElement('img');
      img.src = sm;
      img.title = `${p.slug} ${view}`;
      document.getElementById('out')!.append(img);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return out;
};

if (!navigator.webdriver) window.renderAll();
