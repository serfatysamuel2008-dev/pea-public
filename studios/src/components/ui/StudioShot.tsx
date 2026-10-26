import { motion, useMotionTemplate, type MotionValue } from 'framer-motion';
import { productImage, VIEW_LABELS, type Product } from '../../data/products.ts';

type Props = {
  product: Product;
  size?: 'sm' | 'lg';
  /** Position du reflet de projecteur (0 → 100 %), pilotée par le curseur ou une animation. */
  glint?: MotionValue<number>;
  reflection?: boolean;
  shadow?: boolean;
  priority?: boolean;
  className?: string;
};

/**
 * Paire détourée mise en scène comme en studio : ombre portée au sol, reflet sur un sol brillant
 * et éclat de lumière qui glisse uniquement sur la monture (masque = la photo elle-même).
 */
export function StudioShot({ product, size = 'lg', glint, reflection = true, shadow = true, priority, className = '' }: Props) {
  const src = productImage(product, 'studio', size);
  const pos = useMotionTemplate`${glint ?? 50}% 0`;
  const alt = `Lunettes de soleil STUDIOS ${product.name} ${VIEW_LABELS.studio}, monture ${product.frameLabel.toLowerCase()}, verres ${product.lensLabel.toLowerCase()}`;
  const mask = { WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' };
  return (
    <div className={`relative ${className}`}>
      {shadow && <span aria-hidden className="absolute inset-x-[12%] bottom-[2%] h-[16%] rounded-[50%] bg-black/55 blur-2xl" />}
      <div className="relative">
        <img src={src} alt={alt} width={1100} height={500} loading={priority ? 'eager' : 'lazy'} decoding="async" draggable={false} className="relative block w-full" />
        {glint && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{
              ...mask,
              backgroundImage: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,.55) 48%, rgba(255,255,255,.9) 50%, rgba(255,255,255,.55) 52%, transparent 62%)',
              backgroundSize: '300% 100%',
              backgroundPosition: pos,
            }}
          />
        )}
      </div>
      {reflection && (
        <img
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute left-0 top-full block w-full -scale-y-100 opacity-25 blur-[1.5px] [mask-image:linear-gradient(to_top,rgba(0,0,0,.9),transparent_55%)]"
        />
      )}
    </div>
  );
}
