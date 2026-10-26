import { AnimatePresence, animate, motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { ArrowLeft, ArrowRight, MousePointer2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS, type Product } from '../../data/products.ts';
import { formatPrice } from '../../lib/format.ts';
import { useMediaQuery } from '../../lib/motion.ts';
import { Magnetic } from '../anim/Magnetic.tsx';
import { StudioShot } from '../ui/StudioShot.tsx';
import { INTRO_PLAYS } from './Intro.tsx';

const N = PRODUCTS.length;
const wrap = (d: number) => ((((d + N / 2) % N) + N) % N) - N / 2;

/** Une paire du carrousel : position, taille, rotation et lumière dérivées de sa distance au centre. */
function Pair({ product, index, pos, spacing, tiltX, tiltY, glint }: {
  product: Product; index: number; pos: MotionValue<number>; spacing: number;
  tiltX: MotionValue<number>; tiltY: MotionValue<number>; glint: MotionValue<number>;
}) {
  const d = useTransform(pos, (p) => wrap(index - p));
  const x = useTransform(d, (v) => v * spacing * (1 - Math.min(Math.abs(v), 3) * 0.07));
  const scale = useTransform(d, (v) => 1 / (1 + Math.abs(v) * 0.55));
  const rotateY = useTransform([d, tiltY] as MotionValue<number>[], ([v, t]: number[]) => -Math.max(-1.6, Math.min(1.6, v)) * 22 + t * (1 - Math.min(Math.abs(v), 1)));
  const rotateX = useTransform([d, tiltX] as MotionValue<number>[], ([v, t]: number[]) => t * (1 - Math.min(Math.abs(v), 1)));
  const y = useTransform(d, (v) => Math.min(Math.abs(v), 2) * -18);
  const opacity = useTransform(d, (v) => (Math.abs(v) > 2.6 ? 0 : 1 - Math.max(0, Math.abs(v) - 1.6)));
  const brightness = useTransform(d, (v) => `brightness(${Math.max(0.28, 1 - Math.abs(v) * 0.42)})`);
  const zIndex = useTransform(d, (v) => 100 - Math.round(Math.abs(v) * 10));
  return (
    <motion.div className="absolute left-1/2 top-1/2 w-0" style={{ x, y, scale, rotateY, rotateX, opacity, zIndex, filter: brightness }}>
      <div className="w-[var(--pair-w)] -translate-x-1/2 -translate-y-1/2">
        <StudioShot product={product} glint={glint} priority={index < 3} size="lg" />
      </div>
    </motion.div>
  );
}

/**
 * Accueil « studio photo » : les 13 paires défilent sous les projecteurs en suivant les mouvements
 * (souris, doigt, molette horizontale, flèches), avec une animation d'ouverture où les lumières s'allument.
 */
export function Stage() {
  const reduce = useReducedMotion();
  const mobile = useMediaQuery('(max-width: 767px)');
  const section = useRef<HTMLElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  const [current, setCurrent] = useState(0);
  const [lightsOn, setLightsOn] = useState(false);

  // pos : index flottant de la paire au centre. vel : inertie après un geste.
  const pos = useMotionValue(reduce ? 0 : -N / 2 + 0.5);
  const state = useRef({ vel: 0, dragging: false, lastX: 0, lastT: 0, lastInput: 0, nextAuto: 0, ready: false });
  const tiltX = useSpring(0, { stiffness: 120, damping: 18 });
  const tiltY = useSpring(0, { stiffness: 120, damping: 18 });
  const glint = useSpring(50, { stiffness: 60, damping: 20 });

  const pairW = mobile ? Math.min(width * 0.86, 520) : Math.min(width * 0.5, 820);
  const spacing = mobile ? pairW * 0.82 : pairW * 0.74;

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ouverture : les projecteurs s'allument, puis la collection défile jusqu'à la première paire.
  useEffect(() => {
    const delay = INTRO_PLAYS && performance.now() < 3000 ? 1500 : 250;
    const t1 = window.setTimeout(() => setLightsOn(true), delay);
    if (reduce) {
      state.current.ready = true;
      return () => window.clearTimeout(t1);
    }
    let ctrl: { stop: () => void } | undefined;
    const t2 = window.setTimeout(() => {
      ctrl = animate(pos, 0, { duration: 2.4, ease: [0.16, 1, 0.3, 1], onComplete: () => (state.current.ready = true) });
      animate(glint, [0, 100, 50], { duration: 2.6, ease: 'easeInOut' });
    }, delay + 350);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ctrl?.stop();
    };
  }, [pos, glint, reduce]);

  // Index affiché (nom, prix…) : seulement quand il change.
  useEffect(() => pos.on('change', (p) => setCurrent((((Math.round(p) % N) + N) % N))), [pos]);

  // Physique : inertie, aimantation sur la paire la plus proche, défilement automatique au repos.
  useAnimationFrame((t, delta) => {
    const s = state.current;
    if (!s.ready || s.dragging) return;
    const dt = Math.min(delta, 50) / 1000;
    let p = pos.get();
    if (Math.abs(s.vel) > 0.02) {
      p += s.vel * dt;
      s.vel *= Math.pow(0.04, dt);
    } else {
      s.vel = 0;
      // Au repos depuis 5 s : la paire suivante passe sous le projecteur toutes les 3,5 s.
      if (!reduce && t - s.lastInput > 5000 && t > s.nextAuto && !pos.isAnimating()) {
        s.nextAuto = t + 3500;
        animate(pos, Math.round(p) + 1, { duration: 1.1, ease: [0.65, 0, 0.35, 1] });
        return;
      }
      if (pos.isAnimating()) return;
      const target = Math.round(p);
      p += (target - p) * (1 - Math.exp(-dt * 9));
      if (Math.abs(target - p) < 0.0005) p = target;
    }
    pos.set(p);
  });

  const go = (dir: number) => {
    state.current.vel = 0;
    state.current.lastInput = performance.now();
    animate(pos, Math.round(pos.get()) + dir, { duration: 0.7, ease: [0.16, 1, 0.3, 1] });
  };
  const goTo = (i: number) => {
    const p = pos.get();
    const target = Math.round(p) + wrap(i - p);
    state.current.lastInput = performance.now();
    animate(pos, Math.round(target), { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const s = state.current;
    if (!s.ready) return;
    pos.stop();
    s.dragging = e.pointerType !== 'mouse' || e.button === 0;
    s.lastX = e.clientX;
    s.lastT = performance.now();
    s.vel = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = state.current;
    const r = area.current!.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    tiltY.set((nx - 0.5) * 24);
    tiltX.set((0.5 - ny) * 14);
    glint.set(nx * 100);
    if (!s.ready) return;
    const now = performance.now();
    const dx = e.clientX - s.lastX;
    s.lastX = e.clientX;
    // Souris : la collection suit le mouvement de la main, sans clic. Doigt : glisser.
    const gain = s.dragging ? 1 : e.pointerType === 'mouse' ? 0.55 : 0;
    if (!gain || Math.abs(dx) > 200) {
      s.lastT = now;
      return;
    }
    pos.stop();
    const step = (-dx / spacing) * gain;
    pos.set(pos.get() + step);
    const dt = Math.max(1, now - s.lastT) / 1000;
    s.vel = s.dragging ? step / dt : (step / dt) * 0.35;
    s.lastT = now;
    s.lastInput = now;
  };

  const onPointerUp = () => {
    const s = state.current;
    s.dragging = false;
    s.vel = Math.max(-6, Math.min(6, s.vel));
  };

  const onPointerEnter = (e: React.PointerEvent) => {
    state.current.lastX = e.clientX;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!state.current.ready || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    pos.stop();
    pos.set(pos.get() + e.deltaX / spacing);
    state.current.vel = 0;
    state.current.lastInput = performance.now();
  };

  // Au défilement de la page, la scène recule doucement.
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] });
  const stageScale = useTransform(scrollYProgress, [0, 1], [1, 0.86]);
  const stageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const product = PRODUCTS[current];

  return (
    <section ref={section} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-[#060606] text-paper" aria-label="Collection STUDIOS sous les projecteurs">
      {/* Mur et sol du studio */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,#1b1b1d_0%,#0b0b0c_45%,#050505_100%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-[#0d0d0e] to-[#141416]" />
      <div aria-hidden className="absolute inset-x-0 bottom-[42%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Projecteurs */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" initial={false} animate={{ opacity: lightsOn ? 1 : 0 }} transition={{ duration: 0.05 }}>
        <motion.div
          className="absolute left-1/2 top-[-10%] h-[115%] w-[70vw] max-w-[900px] -translate-x-1/2 bg-[linear-gradient(to_bottom,rgba(255,255,255,.34),rgba(255,255,255,.08)_60%,transparent)] blur-2xl [clip-path:polygon(43%_0,57%_0,100%_100%,0_100%)]"
          animate={lightsOn ? { opacity: [0, 1, 0.35, 1] } : { opacity: 0 }}
          transition={{ duration: 0.6, times: [0, 0.2, 0.35, 1] }}
        />
        <motion.div
          className="absolute left-[8%] top-[-12%] h-[110%] w-[40vw] origin-top rotate-[-24deg] blur-3xl [clip-path:polygon(45%_0,55%_0,100%_100%,0_100%)]"
          style={{ background: `linear-gradient(to bottom, ${product.accent}55, transparent 70%)` }}
          animate={lightsOn ? { opacity: [0, 0.9, 0.2, 0.9] } : { opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        />
        <motion.div
          className="absolute right-[8%] top-[-12%] h-[110%] w-[40vw] origin-top rotate-[24deg] blur-3xl [clip-path:polygon(45%_0,55%_0,100%_100%,0_100%)]"
          style={{ background: 'linear-gradient(to bottom, rgba(49,91,255,.4), transparent 70%)' }}
          animate={lightsOn ? { opacity: [0, 0.9, 0.2, 0.9] } : { opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        />
        {/* Flaque de lumière au sol */}
        <motion.div
          className="absolute bottom-[14%] left-1/2 h-[26%] w-[80vw] max-w-[1100px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,255,255,.22),rgba(255,255,255,.05)_60%,transparent)]"
          animate={lightsOn ? { opacity: [0, 1, 0.4, 1] } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
        {/* Poussières dans le faisceau */}
        {!reduce &&
          Array.from({ length: 22 }, (_, i) => (
            <span
              key={i}
              className="absolute h-[3px] w-[3px] rounded-full bg-white/50 blur-[0.5px]"
              style={{
                left: `${42 + ((i * 37) % 17)}%`,
                top: `${(i * 53) % 90}%`,
                animation: `dust ${9 + (i % 5) * 2}s linear ${-i * 0.9}s infinite`,
              }}
            />
          ))}
      </motion.div>

      {/* Nom géant derrière la paire */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[22%] z-0 flex justify-center overflow-hidden sm:top-[16%]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={product.id}
            className="display whitespace-nowrap text-[24vw] text-white/[0.07] sm:text-[17vw]"
            initial={{ y: '40%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-40%', opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {product.name}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Carrousel */}
      <motion.div style={{ scale: stageScale, y: stageY }} className="absolute inset-0">
        <div
          ref={area}
          className="absolute inset-x-0 top-[12%] bottom-[30%] cursor-grab touch-pan-y select-none [perspective:1400px] active:cursor-grabbing sm:top-[10%] sm:bottom-[24%]"
          style={{ ['--pair-w' as string]: `${pairW}px` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerEnter={onPointerEnter}
          onWheel={onWheel}
          tabIndex={0}
          role="region"
          aria-roledescription="carrousel"
          aria-label={`${product.name}, ${product.frameLabel}, verres ${product.lensLabel}. Flèches gauche et droite pour changer de paire.`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
          }}
        >
          {PRODUCTS.map((p, i) => (
            <Pair key={p.id} product={p} index={i} pos={pos} spacing={spacing} tiltX={tiltX} tiltY={tiltY} glint={glint} />
          ))}
        </div>
      </motion.div>

      {/* Informations et appel à l'action */}
      <div className="absolute inset-x-0 bottom-0 z-[120] pb-[max(env(safe-area-inset-bottom),20px)]">
        <div className="container-x flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <motion.h1
              className="display text-[13vw] leading-[0.86] md:text-[6.2vw]"
              initial={{ opacity: 0, y: 30 }}
              animate={lightsOn ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              Your world. <span className="text-volt">Your frame.</span>
            </motion.h1>
            <motion.div className="mt-5 flex flex-wrap items-center gap-3" initial={{ opacity: 0 }} animate={lightsOn ? { opacity: 1 } : {}} transition={{ delay: 0.9 }}>
              <Magnetic>
                <Link to="/collection" className="btn-volt">
                  Discover the collection <ArrowRight size={16} />
                </Link>
              </Magnetic>
              <span className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/50 md:flex">
                <MousePointer2 size={14} /> Bouge la souris pour faire défiler
              </span>
            </motion.div>
          </div>

          <motion.div className="flex items-end justify-between gap-4 md:flex-col md:items-end" initial={{ opacity: 0 }} animate={lightsOn ? { opacity: 1 } : {}} transition={{ delay: 1.1 }}>
            <div className="md:text-right" aria-live="polite">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/50">
                {String(current + 1).padStart(2, '0')} / {N} · {product.frameLabel}
              </p>
              <Link to={`/produit/${product.slug}`} className="group mt-1 flex items-baseline gap-3 md:justify-end">
                <span className="display text-4xl transition group-hover:text-volt md:text-5xl">{product.name}</span>
                <span className="font-mono text-sm text-volt">{formatPrice(product.priceCents)}</span>
              </Link>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => go(-1)} className="grid h-12 w-12 place-items-center rounded-full ring-1 ring-white/20 transition hover:bg-paper hover:text-ink" aria-label="Paire précédente">
                <ArrowLeft size={18} />
              </button>
              <button type="button" onClick={() => go(1)} className="grid h-12 w-12 place-items-center rounded-full ring-1 ring-white/20 transition hover:bg-paper hover:text-ink" aria-label="Paire suivante">
                <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>
        <div className="container-x mt-5 flex gap-1.5" role="tablist" aria-label="Choisir un coloris">
          {PRODUCTS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={p.name}
              onClick={() => goTo(i)}
              className="group h-6 flex-1"
            >
              <span className={`block h-[3px] rounded-full transition-all ${i === current ? 'bg-volt' : 'bg-white/20 group-hover:bg-white/50'}`} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
