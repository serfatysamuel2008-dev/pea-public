import { AnimatePresence, motion, useSpring } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { productImage, VIEW_LABELS, VIEWS, type Product, type View } from '../../data/products.ts';
import { ProductImage } from '../ui/ProductImage.tsx';
import { StudioShot } from '../ui/StudioShot.tsx';

/** Paire détourée sous un projecteur, sur la couleur du coloris. */
function StudioView({ product }: { product: Product }) {
  const glint = useSpring(30, { stiffness: 50, damping: 18 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  return (
    <div
      className="absolute inset-0 flex items-center justify-center [perspective:1000px]"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;
        glint.set(nx * 100);
        if (e.pointerType === 'mouse') setTilt({ x: (0.5 - (e.clientY - r.top) / r.height) * 8, y: (nx - 0.5) * 14 });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_30%,rgba(255,255,255,.55),transparent_70%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-b from-black/0 to-black/15" />
      <div className="relative w-[84%] transition-transform duration-300 ease-out" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        <StudioShot product={product} glint={glint} priority />
      </div>
    </div>
  );
}

/**
 * Galerie de la fiche produit : paire en studio, photo en situation et gros plan,
 * avec zoom qui suit le curseur, balayage au doigt et plein écran.
 */
export function ProductMedia({ product }: { product: Product }) {
  const [slot, setSlot] = useState<View>('studio');
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => setSlot('studio'), [product.id]);
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
    const i = VIEWS.indexOf(slot);
    setSlot(VIEWS[(i + dir + VIEWS.length) % VIEWS.length]);
  };

  return (
    <div>
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-[32px]"
        style={{ background: product.accent }}
        onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
          touchStart.current = null;
        }}
      >
        <span aria-hidden className="display pointer-events-none absolute inset-x-0 bottom-[-0.12em] text-center text-[20vw] leading-none text-black/[0.08] lg:text-[10vw]">
          {product.name}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.button
            key={slot}
            type="button"
            aria-label={`Agrandir la vue ${VIEW_LABELS[slot]}`}
            className="absolute inset-0 cursor-zoom-in"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            onPointerMove={(e) => {
              if (e.pointerType !== 'mouse' || slot === 'studio') return;
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onPointerLeave={() => setZoom(null)}
            onClick={() => setLightbox(true)}
          >
            {slot === 'studio' ? (
              <StudioView product={product} />
            ) : (
              <ProductImage product={product} view={slot} priority sizes="(min-width: 1024px) 55vw, 100vw" className="h-full w-full object-cover" />
            )}
            {zoom && slot !== 'studio' && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-no-repeat"
                style={{ backgroundImage: `url(${productImage(product, slot)})`, backgroundSize: '200%', backgroundPosition: `${zoom.x}% ${zoom.y}%` }}
              />
            )}
          </motion.button>
        </AnimatePresence>
        <span className="pointer-events-none absolute right-4 top-4 hidden items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink backdrop-blur sm:flex">
          <ZoomIn size={12} /> Zoom
        </span>
      </div>

      <div role="tablist" aria-label="Vues de la paire" className="mt-3 grid grid-cols-3 gap-2">
        {VIEWS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={slot === s}
            aria-label={`Vue ${VIEW_LABELS[s]}`}
            onClick={() => setSlot(s)}
            className={`relative h-20 overflow-hidden rounded-2xl transition sm:h-24 ${slot === s ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100'}`}
            style={{ background: s === 'studio' ? product.accent : '#e9e9e4' }}
          >
            <ProductImage product={product} view={s} size="sm" className={`h-full w-full ${s === 'studio' ? 'object-contain p-2' : 'object-cover'}`} />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name}, vue ${VIEW_LABELS[slot]}`}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            style={{ background: slot === 'studio' ? product.accent : '#0b0b0b' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
          >
            <button type="button" autoFocus className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-ink text-paper" aria-label="Fermer">
              <X size={20} />
            </button>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-5xl">
              <ProductImage product={product} view={slot} sizes="100vw" className="mx-auto max-h-[88svh] w-auto object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
