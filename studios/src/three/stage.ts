// Éclairage studio partagé : environnement de réflexion + lumières.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const cached = envCache.get(renderer);
  if (cached) return cached;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  pmrem.dispose();
  envCache.set(renderer, env);
  return env;
}

export function addStudioLights(scene: THREE.Scene, accent?: string) {
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 8, 10);
  const fill = new THREE.DirectionalLight('#dfe6ff', 0.8);
  fill.position.set(-8, 2, 6);
  const rim = new THREE.DirectionalLight(accent ?? '#ffffff', 1.4);
  rim.position.set(0, 4, -10);
  scene.add(key, fill, rim, new THREE.AmbientLight('#ffffff', 0.35));
}

/** Place la caméra pour que l'objet remplisse `fill` du cadre. */
export function frameObject(camera: THREE.PerspectiveCamera, object: THREE.Object3D, fill = 0.84) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const dist = Math.max(size.x / 2 / Math.tan(hFov / 2), size.y / 2 / Math.tan(vFov / 2)) / fill + size.z / 2;
  camera.position.set(center.x, center.y, center.z + dist);
  camera.lookAt(center);
  camera.near = dist / 20;
  camera.far = dist * 4;
  camera.updateProjectionMatrix();
}
