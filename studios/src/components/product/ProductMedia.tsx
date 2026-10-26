import { AnimatePresence, motion } from 'framer-motion';
import { Rotate3d, X, ZoomIn } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { VIEW_LABELS, VIEWS, type Product, type View } from '../../data/products.ts';
import { canRun3D } from '../../lib/motion.ts';
import { ProductImage } from '../ui/ProductImage.tsx';

const GlassesCanvas = lazy(() => import('../../three/GlassesCanvas.tsx'));

type Slot = View | '360';

/**
 * Galerie de la fiche produit : 4 vues, zoom qui suit le curseur, plein écran au toucher,
 * et une visionneuse 3D à faire tourner du doigt quand l'appareil le permet.
 */
export function ProductMedia({ product }: { product: Product }) {
  const [slot, setSlot] = useState<Slot>('front');
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [has3D, setHas3D] = useState(false);
  const touchStart = useRef<number | null>(null);
  const slots: Slot[] = has3D ? [...VIEWS, '360'] : [...VIEWS];

  useEffect(() => setHas3D(canRun3D()), []);
  useEffect(() => setSlot('front'), [product.id]);
  useEffect(() => {
    if (!lightbox) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(false);
    window.addEventListener('keydown', on);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', on);
      document.documentElement.style.overflow = '';
    };
  }, [lightbox]);

  const step = (dir: 1 | -1) => {
    const i = slots.indexOf(slot);
    setSlot(slots[(i + dir + slots.length) % slots.length]);
  };

  return (
    <div>
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-[32px]"
        style={{ background: product.accent }}
        onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStart.current === null || slot === '360') return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
          touchStart.current = null;
        }}
      >
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,.45),transparent_60%)]" />
        <span aria-hidden className="display pointer-events-none absolute inset-x-0 bottom-[-0.12em] text-center text-[22vw] leading-none text-black/[0.07] lg:text-[11vw]">
          {product.name}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          {slot === '360' ? (
            <motion.div key="360" className="absolute inset-0 cursor-grab active:cursor-grabbing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<div className="grid h-full place-items-center font-mono text-xs uppercase tracking-[0.2em]">Chargement 3D…</div>}>
                <GlassesCanvas spec={product.spec} mode="viewer" className="h-full w-full" label={`${product.name} en 3D : faire glisser pour tourner`} />
              </Suspense>
              <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-paper">
                Glisse pour faire tourner
              </p>
            </motion.div>
          ) : (
            <motion.button
              key={slot}
              type="button"
              aria-label={`Agrandir la vue ${VIEW_LABELS[slot]}`}
              className="absolute inset-0 cursor-zoom-in"
              initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 1.05, rotate: 2 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onPointerMove={(e) => {
                if (e.pointerType !== 'mouse') return;
                const r = e.currentTarget.getBoundingClientRect();
                setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
              }}
              onPointerLeave={() => setZoom(null)}
              onClick={() => setLightbox(true)}
            >
              <ProductImage
                product={product}
                view={slot}
                priority={slot === 'front'}
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="h-full w-full object-contain p-[4%] transition-transform duration-200 ease-out"
              />
              {zoom && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-no-repeat"
                  style={{
                    backgroundImage: `url(${import.meta.env.BASE_URL}products/${product.slug}-${slot}.webp)`,
                    backgroundSize: '220%',
                    backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                    backgroundColor: product.accent,
                  }}
                />
              )}
            </motion.button>
          )}
        </AnimatePresence>
        <span className="pointer-events-none absolute right-4 top-4 hidden items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink backdrop-blur sm:flex">
          <ZoomIn size={12} /> Zoom
        </span>
      </div>

      <div role="tablist" aria-label="Vues du modèle" className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        {slots.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={slot === s}
            aria-label={s === '360' ? 'Vue 3D à 360°' : `Vue ${VIEW_LABELS[s]}`}
            onClick={() => setSlot(s)}
            className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl transition sm:h-24 sm:w-32 ${slot === s ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100'}`}
            style={{ background: s === '360' ? '#080808' : `${product.accent}55` }}
          >
            {s === '360' ? (
              <span className="flex h-full flex-col items-center justify-center gap-1 text-volt">
                <Rotate3d size={22} />
                <span className="font-mono text-[10px] font-bold">360°</span>
              </span>
            ) : (
              <ProductImage product={product} view={s} size="sm" className="h-full w-full object-contain p-1" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox && slot !== '360' && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name}, vue ${VIEW_LABELS[slot]}`}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            style={{ background: product.accent }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
          >
            <button type="button" autoFocus className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-ink text-paper" aria-label="Fermer">
              <X size={20} />
            </button>
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="w-full max-w-6xl">
              <ProductImage product={product} view={slot} sizes="100vw" className="w-full" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
