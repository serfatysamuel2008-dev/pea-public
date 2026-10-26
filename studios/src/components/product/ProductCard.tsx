import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../data/products.ts';
import { useCart } from '../../store/cart.tsx';
import { useToast } from '../../store/toast.tsx';
import { productImage } from '../../data/products.ts';
import { Tilt } from '../anim/Tilt.tsx';
import { FavoriteButton } from '../ui/FavoriteButton.tsx';
import { Price } from '../ui/Price.tsx';
import { ProductImage } from '../ui/ProductImage.tsx';

type Props = { product: Product; index?: number; size?: 'normal' | 'large' | 'wide'; tone?: 'light' | 'dark' };

/**
 * Carte produit : au survol, le fond prend la couleur du modèle et la paire pivote
 * vers sa vue trois-quarts. Au toucher, la carte reste lisible et cliquable.
 */
export function ProductCard({ product, index = 0, size = 'normal', tone = 'light' }: Props) {
  const { add, setOpen } = useCart();
  const { notify } = useToast();
  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({ productId: product.id, qty: 1 });
    notify({
      title: 'Dans ton panier',
      body: `${product.name} — 29,90 €`,
      image: productImage(product, 'front', 'sm'),
      action: { label: 'Voir', onClick: () => setOpen(true) },
    });
  };
  const base = tone === 'light' ? 'bg-[#f2f2ee] text-ink' : 'bg-white/[0.06] text-paper';

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -5% 0px' }}
      transition={{ duration: 0.8, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group h-full"
    >
      <Tilt className="h-full rounded-[28px]" max={6}>
        <div className={`relative flex h-full flex-col overflow-hidden rounded-[28px] ${base} has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-electric`}>
          {/* Fond coloré révélé au survol */}
          <span
            aria-hidden
            className="absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-y-100"
            style={{ background: product.accent }}
          />
          <span aria-hidden className="eyebrow absolute left-5 top-5 z-10 opacity-60 transition-colors group-hover:opacity-100" style={{ color: 'inherit' }}>
            {String(product.drop).padStart(2, '0')}
          </span>
          <div
            className={`relative ${size === 'large' ? 'aspect-[4/3] lg:aspect-auto lg:flex-1' : size === 'wide' ? 'aspect-[4/3] lg:aspect-[16/7]' : 'aspect-[4/3]'} [transform:translateZ(40px)]`}
          >
            {/* Vue de face, remplacée au survol par la vue trois-quarts qui pivote */}
            <span className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-90 group-hover:opacity-0">
              <ProductImage product={product} view="front" sizes={size === 'normal' ? undefined : '(min-width: 1024px) 50vw, 50vw'} className="h-full w-full object-contain p-[6%]" />
            </span>
            <span className="absolute inset-0 scale-110 opacity-0 transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)] [rotate:-6deg] group-hover:scale-100 group-hover:opacity-100 group-hover:[rotate:0deg]">
              <ProductImage product={product} view="three-quarter" sizes={size === 'normal' ? undefined : '(min-width: 1024px) 50vw, 50vw'} className="h-full w-full object-contain p-[6%]" />
            </span>
            <span aria-hidden className="absolute bottom-[10%] left-1/2 h-4 w-1/2 -translate-x-1/2 rounded-[50%] bg-black/25 blur-xl" />
          </div>
          {/* Lien sur toute la carte ; les boutons restent au-dessus. */}
          <Link to={`/produit/${product.slug}`} aria-label={`${product.name}, 29,90 €, voir le modèle`} className="absolute inset-0 z-[5] rounded-[28px] outline-none" />
          <div className={`pointer-events-none relative z-10 flex items-end justify-between gap-3 p-5 pt-0 ${product.accent === '#080808' ? 'group-hover:text-paper' : ''}`}>
            <div className="min-w-0">
              <h3 className={`display truncate ${size === 'large' ? 'text-4xl sm:text-5xl' : 'text-[26px] sm:text-3xl'}`}>
                {product.name}
              </h3>
              <p className="mt-1 font-mono text-[13px]">
                <Price cents={product.priceCents} />
              </p>
            </div>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={quickAdd}
                aria-label={`Ajouter ${product.name} au panier`}
                className="pointer-events-auto relative z-10 grid h-11 w-11 place-items-center rounded-full bg-ink text-paper transition hover:rotate-90 hover:bg-electric"
              >
                <Plus size={18} />
              </button>
            </span>
          </div>
          <FavoriteButton product={product} className="!absolute right-4 top-4 z-10" />
        </div>
      </Tilt>
    </motion.article>
  );
}
