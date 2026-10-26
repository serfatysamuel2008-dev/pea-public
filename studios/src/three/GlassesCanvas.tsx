// Scène 3D temps réel (hero et visionneuse 360°), construite avec le même générateur que les packshots.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { FrameSpec } from '../data/products.ts';
import { buildGlasses } from './buildGlasses.ts';
import { studioEnvironment } from './stage.ts';

type Mode = 'hero' | 'viewer';

type Props = {
  spec: FrameSpec;
  mode: Mode;
  /** Avancement du défilement (0 → 1) qui pilote la rotation dans le hero. */
  progress?: MutableRefObject<number>;
  accent?: string;
  className?: string;
  label: string;
};

function Rig({ spec, mode, progress, accent }: Omit<Props, 'className' | 'label'>) {
  const { gl, scene, camera, size } = useThree();
  const model = useMemo(() => buildGlasses(spec), [spec]);
  const holder = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const drag = useRef({ active: false, x: 0, y: 0, vx: 0, vy: 0, rotY: -0.5, rotX: 0.1, idle: 0 });
  const intro = useRef(0);

  useEffect(() => () => model.dispose(), [model]);
  useEffect(() => {
    scene.environment = studioEnvironment(gl);
  }, [gl, scene]);

  // Cadrage selon le format de l'écran (portrait sur mobile).
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const target = mode === 'hero' ? (aspect < 1 ? 0.8 : 0.5) : 0.78;
    const width = model.width + 1;
    const vFov = THREE.MathUtils.degToRad(cam.fov);
    const visibleWidthAt1 = 2 * Math.tan(vFov / 2) * aspect;
    const dist = Math.max(width / (visibleWidthAt1 * target), (spec.lensH * 2.6) / (2 * Math.tan(vFov / 2)));
    cam.position.set(0, 0, dist);
    cam.near = 0.5;
    cam.far = dist * 4;
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, model, mode, spec.lensH]);

  useEffect(() => {
    intro.current = 0;
  }, [model]);

  // Hero : la paire suit le curseur (ou l'inclinaison au doigt via le défilement).
  useEffect(() => {
    if (mode !== 'hero') return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mode]);

  // Visionneuse : rotation au glisser, avec inertie.
  useEffect(() => {
    if (mode !== 'viewer') return;
    const el = gl.domElement;
    const d = drag.current;
    const down = (e: PointerEvent) => {
      d.active = true;
      d.x = e.clientX;
      d.y = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!d.active) return;
      d.vx = (e.clientX - d.x) * 0.012;
      d.vy = (e.clientY - d.y) * 0.006;
      d.rotY += d.vx;
      d.rotX = THREE.MathUtils.clamp(d.rotX + d.vy, -0.6, 0.8);
      d.x = e.clientX;
      d.y = e.clientY;
      d.idle = 0;
    };
    const up = () => {
      d.active = false;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl, mode]);

  useFrame((state, dt) => {
    const g = holder.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const delta = Math.min(dt, 0.05);
    intro.current = Math.min(1, intro.current + delta * 1.2);
    const e = 1 - (1 - intro.current) ** 3;
    if (mode === 'hero') {
      const p = progress?.current ?? 0;
      const targetY = -0.35 + pointer.current.x * 0.45 + p * Math.PI * 1.15 + (1 - e) * -1.6;
      const targetX = 0.08 + pointer.current.y * 0.22 + Math.sin(t * 0.6) * 0.04 + p * 0.25;
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 4, delta);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 4, delta);
      g.rotation.z = Math.sin(t * 0.5) * 0.04;
      g.position.y = Math.sin(t * 0.9) * 0.35 - p * 1.5;
      const s = (0.7 + 0.3 * e) * (1 + p * 0.5);
      g.scale.setScalar(s);
    } else {
      const d = drag.current;
      d.idle += delta;
      if (!d.active) {
        d.vx *= 0.94;
        d.rotY += d.vx;
        if (d.idle > 1.5) d.rotY += delta * 0.45;
      }
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, d.rotY, 8, delta);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, d.rotX, 8, delta);
      g.position.y = Math.sin(t * 1.1) * 0.12;
      g.scale.setScalar(0.85 + 0.15 * e);
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 8, 10]} intensity={2} />
      <directionalLight position={[-8, 2, 6]} intensity={0.6} color="#dfe6ff" />
      {mode === 'hero' && (
        <>
          <pointLight position={[-12, 5, 6]} intensity={160} decay={1.6} color="#FF3CAC" />
          <pointLight position={[12, -4, 6]} intensity={160} decay={1.6} color="#315BFF" />
          <pointLight position={[0, 6, -10]} intensity={120} decay={1.6} color={accent ?? '#C6FF00'} />
        </>
      )}
      <group ref={holder}>
        <primitive object={model.group} />
      </group>
    </>
  );
}

export default function GlassesCanvas({ className = '', label, ...rest }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} className={className} role="img" aria-label={label}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ fov: 20, position: [0, 0, 60] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        style={{ touchAction: rest.mode === 'viewer' ? 'pan-y' : 'auto' }}
      >
        <Rig {...rest} />
      </Canvas>
    </div>
  );
}
