import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const KEY = 'studios.intro.seen';
const LETTERS = 'STUDIOS'.split('');

function alreadySeen() {
  try {
    return sessionStorage.getItem(KEY) === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Animation du logo à l'ouverture : 1,6 s maximum, une fois par session, passable d'un clic ou d'une touche. */
export function Intro() {
  const [show, setShow] = useState(() => !alreadySeen());
  useEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    const done = () => setShow(false);
    const t = window.setTimeout(done, 1650);
    window.addEventListener('keydown', done);
    window.addEventListener('wheel', done, { passive: true });
    window.addEventListener('touchstart', done, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', done);
      window.removeEventListener('wheel', done);
      window.removeEventListener('touchstart', done);
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          onClick={() => setShow(false)}
          className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-ink"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.div
            className="absolute h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle,#315BFF_0%,#8B5CF6_35%,transparent_70%)] opacity-60 blur-3xl"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.7 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          />
          <h1 className="display relative flex text-[22vw] text-paper sm:text-[18vw]">
            {LETTERS.map((l, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ y: '60%', scaleY: 2.2, opacity: 0, filter: 'blur(18px)' }}
                animate={{ y: '0%', scaleY: 1, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, delay: 0.05 + Math.abs(i - 3) * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                {l}
              </motion.span>
            ))}
          </h1>
          {/* Balayage de lumière sur le logo */}
          <motion.div
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            initial={{ x: '-150%' }}
            animate={{ x: '350%' }}
            transition={{ duration: 1.1, delay: 0.55, ease: [0.65, 0, 0.35, 1] }}
          />
          <motion.p
            className="eyebrow absolute bottom-10 text-paper/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Your world. Your frame.
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
