import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS } from '../../data/products.ts';
import { UNIT_PRICE_CENTS } from '../../data/shop.ts';
import { formatPrice } from '../../lib/format.ts';
import { SplitLines } from '../anim/Reveal.tsx';
import { ProductImage } from '../ui/ProductImage.tsx';

/** Le prix unique comme signature : chiffre géant qui se remplit au défilement, toutes les paires au même prix. */
export function PriceSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const fill = useTransform(scrollYProgress, [0.3, 1], ['0%', '100%']);
  const clip = useTransform(fill, (f) => `inset(0 calc(100% - ${f}) 0 0)`);
  const price = formatPrice(UNIT_PRICE_CENTS);

  return (
    <section ref={ref} className="relative overflow-hidden bg-ink py-28 text-paper sm:py-40" aria-labelledby="price-title">
      <div className="container-x">
        <p className="eyebrow mb-6 text-volt">Prix unique</p>
        <SplitLines as="h2" lines={['One price.', 'Your style.']} className="display text-[16vw] sm:text-[9vw]" />
        <p className="mt-6 max-w-md text-xl text-paper/75">Tous les modèles. Le même prix. À toi de choisir.</p>

        <div className="relative mt-14 select-none" aria-label={`Prix de chaque paire : ${price}`} role="img">
          <span className="display text-outline block whitespace-nowrap text-[27vw] leading-none text-paper/30">{price}</span>
          <motion.span
            aria-hidden
            style={{ clipPath: clip }}
            className="display absolute inset-0 block whitespace-nowrap text-[27vw] leading-none text-volt"
          >
            {price}
          </motion.span>
        </div>
      </div>

      {/* Toutes les paires, même étiquette */}
      <div className="mt-16 overflow-hidden" aria-hidden>
        <div className="marquee" style={{ ['--marquee-duration' as string]: '60s' }}>
          {[...PRODUCTS, ...PRODUCTS].map((p, i) => (
            <div key={i} className="mx-2 w-56 shrink-0 rounded-3xl bg-white/[0.05] p-4 ring-1 ring-white/10">
              <ProductImage product={p} view="front" size="sm" className="aspect-[4/3] w-full object-contain" />
              <div className="mt-2 flex items-baseline justify-between">
                <span className="display text-xl">{p.name}</span>
                <span className="font-mono text-xs text-volt">{price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-14 flex justify-center">
        <Link to="/collection" className="btn-volt">Choisir ma paire</Link>
      </div>
    </section>
  );
}
