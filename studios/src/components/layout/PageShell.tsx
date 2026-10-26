import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Transition entre les pages : fondu et légère montée du contenu. */
export function PageShell({ children }: { children: ReactNode; tone?: 'dark' | 'light' }) {
  const reduce = useReducedMotion();
  return (
    <motion.main
      id="contenu"
      className="min-h-screen bg-ink text-paper"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.main>
  );
}
