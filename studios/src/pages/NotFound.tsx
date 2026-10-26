import { Link } from 'react-router-dom';
import { getProduct } from '../data/products.ts';
import { useSeo } from '../lib/seo.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { ProductImage } from '../components/ui/ProductImage.tsx';

export default function NotFound() {
  useSeo({ title: 'Page introuvable', description: 'Cette page n’existe pas.', noindex: true });
  return (
    <PageShell>
      <div className="container-x grid min-h-[100svh] place-items-center pt-24 text-center">
        <div>
          <ProductImage product={getProduct('shadow')!} view="studio" size="sm" className="floaty mx-auto w-72" />
          <h1 className="display mt-4 text-8xl">404</h1>
          <p className="mt-2 text-paper/70">Même avec des lunettes, on ne trouve pas cette page.</p>
          <Link to="/" className="btn-light mt-8">Retour à l’accueil</Link>
        </div>
      </div>
    </PageShell>
  );
}
