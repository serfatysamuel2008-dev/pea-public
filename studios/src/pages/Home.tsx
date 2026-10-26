import { ArrowRight, CreditCard, Package, RotateCcw, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRODUCTS, SHAPE_LABEL } from '../data/products.ts';
import { BRAND, RETURN_DAYS } from '../data/shop.ts';
import { useSeo } from '../lib/seo.ts';
import { usePaymentConfig } from '../lib/usePaymentConfig.ts';
import { Reveal, SplitLines } from '../components/anim/Reveal.tsx';
import { FilmSection } from '../components/film/FilmSection.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { ProductCard } from '../components/product/ProductCard.tsx';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND.name,
  url: BRAND.siteUrl,
  sameAs: [BRAND.instagram, BRAND.tiktok],
};

/** Engagements réels uniquement : chaque ligne renvoie vers la page qui la détaille. */
function Promise() {
  const payment = usePaymentConfig();
  const items = [
    { icon: Tag, title: 'Un seul prix', body: '29,90 € la paire, quel que soit le coloris.', to: '/collection' },
    { icon: Package, title: 'Livraison', body: 'En point relais ou à domicile.', to: '/livraison-retours' },
    { icon: RotateCcw, title: `${RETURN_DAYS} jours pour changer d’avis`, body: 'Droit de rétractation sur chaque commande.', to: '/livraison-retours' },
    { icon: CreditCard, title: 'Paiement', body: payment?.stripe ? 'Carte bancaire, paiement sécurisé par Stripe.' : 'Paiement en ligne bientôt disponible.', to: '/faq' },
  ];
  return (
    <section className="border-t border-white/[0.06]" aria-label="Nos engagements">
      <ul className="container-x grid gap-px py-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, body, to }) => (
          <li key={title}>
            <Link to={to} className="flex h-full items-start gap-4 rounded-2xl p-5 transition hover:bg-white/[0.03]">
              <Icon size={18} className="mt-0.5 shrink-0 text-paper/60" />
              <span>
                <span className="block font-medium">{title}</span>
                <span className="text-sm text-mist">{body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  useSeo({
    description: `${BRAND.name} Round 01 : lunettes de soleil rondes à pont en trou de serrure, en ${PRODUCTS.length} coloris, toutes à 29,90 €.`,
    jsonLd: JSON_LD,
  });
  return (
    <PageShell>
      <FilmSection />
      <section className="relative py-28 sm:py-36" aria-labelledby="collection-title">
        <div className="container-x">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow mb-5 text-mist">La collection — {PRODUCTS.length} coloris</p>
              <SplitLines as="h2" lines={['Trouve ta paire.']} className="display text-5xl sm:text-7xl" />
            </div>
            <Reveal className="lg:max-w-sm">
              <p className="text-mist">{SHAPE_LABEL}. Une seule forme, déclinée en écaille, translucide, dégradé ou noir brillant.</p>
              <Link to="/collection" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-paper hover:underline">
                Filtrer la collection <ArrowRight size={15} />
              </Link>
            </Reveal>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {PRODUCTS.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>
      <Promise />
    </PageShell>
  );
}
