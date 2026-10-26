import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useRef } from 'react';
import { getProduct } from '../../data/products.ts';
import { ProductImage } from '../ui/ProductImage.tsx';

const WORDS = 'Pas de logo géant. Pas de prix qui grimpe. Juste des montures fortes, pensées pour ton style, et un seul prix pour toutes.'.split(' ');

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.22em] inline-block">
      {word}
    </motion.span>
  );
}

function Floating({ slug, progress, className, speed, rotate }: { slug: string; progress: MotionValue<number>; className: string; speed: number; rotate: number }) {
  const y = useTransform(progress, [0, 1], [`${speed * 60}%`, `${-speed * 60}%`]);
  const r = useTransform(progress, [0, 1], [-rotate, rotate]);
  const product = getProduct(slug)!;
  return (
    <motion.div aria-hidden style={{ y, rotate: r }} className={`pointer-events-none absolute ${className}`}>
      <ProductImage product={product} view="studio" size="sm" className="w-full drop-shadow-[0_30px_40px_rgba(0,0,0,.45)]" />
    </motion.div>
  );
}

/** Texte révélé mot à mot au défilement, avec des paires en parallaxe à des vitesses différentes. */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const reading = useTransform(scrollYProgress, [0.15, 0.6], [0, 1]);
  return (
    <section ref={ref} className="relative overflow-hidden bg-electric py-[22vh] text-paper">
      <Floating slug="champagne" progress={scrollYProgress} speed={1.2} rotate={14} className="-left-[6%] top-[4%] w-[46vw] sm:w-[26vw]" />
      <Floating slug="havana" progress={scrollYProgress} speed={0.7} rotate={-10} className="-right-[8%] bottom-[2%] w-[52vw] sm:w-[30vw]" />
      <Floating slug="ocean" progress={scrollYProgress} speed={1.6} rotate={20} className="right-[12%] top-[2%] hidden w-[18vw] sm:block" />
      <div className="container-x relative">
        <p className="eyebrow mb-8 text-volt">Manifeste — 01</p>
        <p className="display max-w-[15ch] text-[13vw] leading-[0.9] sm:text-[8.4vw]">
          {WORDS.map((w, i) => (
            <Word key={i} word={w} progress={reading} range={[i / WORDS.length, (i + 1) / WORDS.length]} />
          ))}
        </p>
      </div>
    </section>
  );
}
