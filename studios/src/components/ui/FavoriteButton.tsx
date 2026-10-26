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
      whileTap={{ scale: 0.8 }}
      aria-pressed={active}
      aria-label={active ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggle(product.id);
        notify({ title: added ? 'Ajouté aux favoris' : 'Retiré des favoris', body: product.name });
      }}
      className={`grid h-11 w-11 place-items-center rounded-full bg-white/80 text-ink backdrop-blur transition hover:bg-white ${className}`}
    >
      <Heart size={18} className={active ? 'fill-flash text-flash' : ''} />
    </motion.button>
  );
}
