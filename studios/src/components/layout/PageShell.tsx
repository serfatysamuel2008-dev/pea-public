import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Transition entre les pages : un rideau vert acide se retire, le contenu monte. */
export function PageShell({ children, tone = 'dark' }: { children: ReactNode; tone?: 'dark' | 'light' }) {
  const reduce = useReducedMotion();
  return (
    <motion.main
      id="contenu"
      className={tone === 'light' ? 'on-light min-h-screen bg-paper text-ink' : 'min-h-screen'}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[70] origin-top bg-volt"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
        />
      )}
      {children}
    </motion.main>
  );
}
