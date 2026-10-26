import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProduct, PRODUCTS, type Product } from '../../data/products.ts';
import { canRun3D } from '../../lib/motion.ts';
import { Magnetic } from '../anim/Magnetic.tsx';
import { ProductImage } from '../ui/ProductImage.tsx';

const GlassesCanvas = lazy(() => import('../../three/GlassesCanvas.tsx'));

const HERO_MODELS = ['chrome', 'afterhours', 'neon', 'volt'].map((s) => getProduct(s)!) as Product[];

/** Repli sans WebGL : packshot flottant qui suit le curseur. */
function StaticGlasses({ product }: { product: Product }) {
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const on = (e: PointerEvent) => setP({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, []);
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div style={{ transform: `translate3d(${p.x * -30}px, ${p.y * -20}px, 0) rotateY(${p.x * 16}deg)` }} className="w-[92vw] max-w-[860px] transition-transform duration-300 ease-out [perspective:800px] sm:w-[62vw]">
        <ProductImage product={product} view="front" priority className="floaty w-full drop-shadow-[0_40px_60px_rgba(0,0,0,.6)]" />
      </div>
    </div>
  );
}

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [index, setIndex] = useState(0);
  const [use3D, setUse3D] = useState(false);
  const product = HERO_MODELS[index];

  useEffect(() => setUse3D(canRun3D()), []);

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progress.current = v;
  });
  const leftX = useTransform(scrollYProgress, [0, 0.6], ['0%', '-35%']);
  const rightX = useTransform(scrollYProgress, [0, 0.6], ['0%', '35%']);
  const fade = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const glow = useTransform(scrollYProgress, [0, 0.7], [1, 0.25]);

  return (
    <section ref={section} className="relative h-[170svh] bg-ink" aria-label="STUDIOS, lunettes de soleil">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Lumières d'ambiance */}
        <motion.div aria-hidden style={{ opacity: glow }} className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-10%] top-[10%] h-[55vmax] w-[55vmax] animate-[spin_40s_linear_infinite] rounded-full bg-[conic-gradient(from_90deg,#315BFF,#8B5CF6,#FF3CAC,#315BFF)] opacity-35 blur-[120px]" />
          <AnimatePresence mode="popLayout">
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.55, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute bottom-[-20%] right-[-10%] h-[50vmax] w-[50vmax] rounded-full blur-[110px]"
              style={{ background: product.accent === '#080808' ? '#C6FF00' : product.accent }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#080808_85%)]" />
        </motion.div>

        {/* Slogan massif, de part et d'autre de la paire */}
        <h1 className="display pointer-events-none absolute inset-x-0 top-[17%] z-0 select-none text-paper sm:top-[12%]">
          <motion.span style={{ x: leftX }} className="block pl-4 text-[19vw] sm:pl-8 sm:text-[13.5vw]">
            <motion.span className="block" initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              Your world.
            </motion.span>
          </motion.span>
          <motion.span style={{ x: rightX }} className="mt-[28vh] block pr-4 text-right text-[19vw] sm:mt-[16vw] sm:pr-8 sm:text-[13.5vw]">
            <motion.span className="block" initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}>
              Your <span className="text-volt">frame.</span>
            </motion.span>
          </motion.span>
        </h1>

        {/* Lunettes flottantes */}
        <div className="absolute inset-0 z-10">
          {use3D ? (
            <Suspense fallback={<StaticGlasses product={product} />}>
              <GlassesCanvas
                spec={product.spec}
                mode="hero"
                progress={progress}
                accent={product.accent === '#080808' ? '#C6FF00' : product.accent}
                className="h-full w-full"
                label={`Lunettes ${product.name} en 3D`}
              />
            </Suspense>
          ) : (
            <StaticGlasses product={product} />
          )}
        </div>

        {/* Appel à l'action et sélection du modèle */}
        <motion.div style={{ opacity: fade }} className="absolute inset-x-0 bottom-0 z-20 pb-[max(env(safe-area-inset-bottom),24px)]">
          <div className="container-x flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-sm">
              <p className="mb-5 text-[15px] leading-snug text-paper/75">
                <span className="font-bold text-paper">{PRODUCTS.length} modèles. Un seul prix : 29,90 €.</span> Des montures qui ne passent pas inaperçues.
              </p>
              <Magnetic>
                <Link to="/collection" className="btn-volt">
                  Discover the collection <ArrowRight size={16} />
                </Link>
              </Magnetic>
            </div>
            <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
              <div role="radiogroup" aria-label="Changer de modèle" className="flex gap-2">
                {HERO_MODELS.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={i === index}
                    onClick={() => setIndex(i)}
                    className={`group relative h-14 w-[72px] overflow-hidden rounded-2xl bg-white/10 backdrop-blur transition hover:bg-white/20 ${i === index ? 'ring-2 ring-volt' : 'ring-1 ring-white/15'}`}
                    aria-label={m.name}
                  >
                    <ProductImage product={m} view="front" size="sm" className="h-full w-full object-contain p-1" />
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.p key={product.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="eyebrow text-paper/70">
                  <Link to={`/produit/${product.slug}`} className="hover:text-volt">
                    {product.name} — 29,90 € →
                  </Link>
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          <div className="mt-6 hidden justify-center sm:flex" aria-hidden>
            <span className="eyebrow flex items-center gap-2 text-paper/50">
              <ArrowDown size={14} className="animate-bounce" /> Scroll
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
