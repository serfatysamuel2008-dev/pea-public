import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Apparition au défilement (une seule fois). */
export function Reveal({ children, delay = 0, y = 40, className = '' }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Titre qui monte ligne par ligne derrière un masque. */
export function SplitLines({ lines, className = '', delay = 0, as: Tag = 'h2' }: { lines: ReactNode[]; className?: string; delay?: number; as?: 'h1' | 'h2' | 'p' }) {
  const reduce = useReducedMotion();
  return (
    <Tag className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.04em]">
          <motion.span
            className="block"
            initial={reduce ? false : { y: '110%', rotate: 4 }}
            whileInView={{ y: '0%', rotate: 0 }}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 1, delay: delay + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
