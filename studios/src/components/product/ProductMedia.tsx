import { AnimatePresence, motion } from 'framer-motion';
import { Box, Hand } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { VIEW_LABELS, VIEWS, type Product, type View } from '../../data/products.ts';
import { GlassesFilm, webglAvailable } from '../../three/Film.ts';
import { ProductImage } from '../ui/ProductImage.tsx';

type Slot = '3d' | View;

/** Visionneuse 3D : la paire tourne seule, on la fait pivoter au doigt ou à la souris. */
function Viewer3D({ product }: { product: Product }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const film = useRef<GlassesFilm | null>(null);
  useEffect(() => {
    const el = canvas.current!;
    const f = new GlassesFilm(el, product.look, { viewer: true });
    film.current = f;
    const ro = new ResizeObserver(() => f.resize(el.clientWidth, el.clientHeight));
    ro.observe(el);
    f.resize(el.clientWidth, el.clientHeight);
    f.start();
    return () => {
      ro.disconnect();
      f.dispose();
      film.current = null;
    };
    // La paire est construite une fois ; le coloris change ci-dessous sans tout reconstruire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => film.current?.setLook(product.look), [product.look]);
  return <canvas ref={canvas} className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing" aria-label={`${product.name} en 3D : faire glisser pour tourner la paire`} role="img" />;
}

/** Galerie de la fiche produit : modèle 3D, paire détourée et gros plan, sans fond de photo. */
export function ProductMedia({ product }: { product: Product }) {
  const [has3D] = useState(() => webglAvailable());
  const slots: Slot[] = has3D ? ['3d', ...VIEWS] : [...VIEWS];
  const [slot, setSlot] = useState<Slot>(slots[0]);

  return (
    <div>
      <div className="card relative aspect-[4/3] overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_35%,rgba(255,255,255,.07),transparent_70%)]" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slot}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {slot === '3d' ? (
              <Viewer3D product={product} />
            ) : (
              <div className="flex h-full items-center justify-center p-[7%]">
                <ProductImage product={product} view={slot} priority sizes="(min-width: 1024px) 55vw, 100vw" className="h-full w-full object-contain" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {slot === '3d' && (
          <p className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/80 backdrop-blur">
            <Hand size={12} /> Glisser pour tourner
          </p>
        )}
        <p className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.18em] text-mist">
          {slot === '3d' ? 'Modèle 3D' : slot === 'studio' ? 'Photo détourée' : 'Gros plan'}
        </p>
      </div>

      <div role="tablist" aria-label="Vues de la paire" className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={slot === s}
            aria-label={s === '3d' ? 'Modèle 3D' : `Vue ${VIEW_LABELS[s]}`}
            onClick={() => setSlot(s)}
            className={`card relative grid h-20 place-items-center overflow-hidden transition sm:h-24 ${slot === s ? '!ring-paper/70' : 'opacity-60 hover:opacity-100'}`}
          >
            {s === '3d' ? (
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
                <Box size={16} /> 3D
              </span>
            ) : (
              <ProductImage product={product} view={s} size="sm" className="h-full w-full object-contain p-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
