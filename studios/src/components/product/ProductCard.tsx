import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productImage, type Product } from '../../data/products.ts';
import { useCart } from '../../store/cart.tsx';
import { useToast } from '../../store/toast.tsx';
import { FavoriteButton } from '../ui/FavoriteButton.tsx';
import { Price } from '../ui/Price.tsx';
import { ProductImage } from '../ui/ProductImage.tsx';

/** Carte coloris : paire détourée sous un halo de lumière, qui se soulève au survol. */
export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add, setOpen } = useCart();
  const { notify } = useToast();
  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({ productId: product.id, qty: 1 });
    notify({
      title: 'Ajouté au panier',
      body: `${product.name} — 29,90 €`,
      image: productImage(product, 'studio', 'sm'),
      action: { label: 'Voir', onClick: () => setOpen(true) },
    });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -5% 0px' }}
      transition={{ duration: 0.8, delay: (index % 3) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group card relative flex h-full flex-col overflow-hidden transition-colors duration-500 hover:bg-smoke"
    >
      <Link to={`/produit/${product.slug}`} aria-label={`${product.name}, ${product.frameLabel}, 29,90 €`} className="absolute inset-0 z-[5] rounded-[22px]" />
      <div className="relative aspect-[5/3]">
        <span aria-hidden className="absolute inset-x-[15%] top-[8%] h-[70%] rounded-full bg-white/[0.06] opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
        <span aria-hidden className="absolute bottom-[16%] left-1/2 h-4 w-3/5 -translate-x-1/2 rounded-[50%] bg-black/70 blur-xl" />
        <div className="absolute inset-0 flex items-center px-[8%] transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-2 group-hover:scale-[1.04]">
          <ProductImage product={product} className="w-full" />
        </div>
      </div>
      <div className="relative z-10 mt-auto flex items-end justify-between gap-3 p-5 pt-0">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight">{product.name}</h3>
          <p className="truncate text-sm text-mist">{product.frameLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <Price cents={product.priceCents} className="text-sm text-paper/80" />
          <button
            type="button"
            onClick={quickAdd}
            aria-label={`Ajouter ${product.name} au panier`}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] text-paper transition hover:bg-paper hover:text-ink"
          >
            <Plus size={17} />
          </button>
        </div>
      </div>
      <FavoriteButton product={product} className="absolute right-3 top-3 z-10" />
    </motion.article>
  );
}
