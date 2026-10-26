import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { ReactNode } from 'react';

/** Carte qui s'incline vers le curseur (souris uniquement ; neutre au toucher). */
export function Tilt({ children, className = '', max = 10 }: { children: ReactNode; className?: string; max?: number }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const sx = useSpring(x, { stiffness: 220, damping: 22 });
  const sy = useSpring(y, { stiffness: 220, damping: 22 });
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const glareX = useTransform(sx, [0, 1], ['0%', '100%']);
  const glareY = useTransform(sy, [0, 1], ['0%', '100%']);
  const glare = useTransform([glareX, glareY], ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,.35), transparent 55%)`);
  return (
    <motion.div
      className={`[perspective:1000px] ${className}`}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
    >
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative h-full w-full">
        {children}
        <motion.div aria-hidden style={{ background: glare }} className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-100" />
      </motion.div>
    </motion.div>
  );
}
