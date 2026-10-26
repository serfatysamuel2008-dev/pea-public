import { Link } from 'react-router-dom';
import { getProductById } from '../data/products.ts';
import { useSeo } from '../lib/seo.ts';
import { useFavorites } from '../store/favorites.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { ProductCard } from '../components/product/ProductCard.tsx';

export default function Favorites() {
  useSeo({ title: 'Favoris', description: 'Tes modèles STUDIOS préférés.', noindex: true });
  const { ids } = useFavorites();
  const products = ids.map(getProductById).filter((p) => !!p);
  return (
    <PageShell tone="light">
      <div className="container-x min-h-[80svh] pb-24 pt-32 sm:pt-40">
        <h1 className="display text-[18vw] sm:text-[9vw]">Favoris</h1>
        <p className="mt-2 text-black/60">Enregistrés sur cet appareil.</p>
        {products.length === 0 ? (
          <div className="mt-12 rounded-[28px] bg-black/[0.04] px-6 py-20 text-center">
            <p className="display text-4xl">Aucun favori pour l’instant.</p>
            <p className="mt-2 text-black/60">Touche le cœur sur une paire pour la retrouver ici.</p>
            <Link to="/collection" className="btn-ink mt-8">Explorer la collection</Link>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p!.id} product={p!} index={i} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
