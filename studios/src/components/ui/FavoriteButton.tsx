import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '../../data/products.ts';
import { useFavorites } from '../../store/favorites.tsx';
import { useToast } from '../../store/toast.tsx';

export function FavoriteButton({ product, className = '' }: { product: Product; className?: string }) {
  const { has, toggle } = useFavorites();
  const { notify } = useToast();
  const active = has(product.id);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      aria-pressed={active}
      aria-label={active ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggle(product.id);
        notify({ title: added ? 'Ajouté aux favoris' : 'Retiré des favoris', body: product.name });
      }}
      className={`grid h-10 w-10 place-items-center rounded-full text-paper/70 transition hover:bg-white/10 hover:text-paper ${className}`}
    >
      <Heart size={17} className={active ? 'fill-paper text-paper' : ''} />
    </motion.button>
  );
}
