import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FINISHES, PRODUCTS } from '../../data/products.ts';
import { SplitLines } from '../anim/Reveal.tsx';
import { ProductCard } from '../product/ProductCard.tsx';

/** Grille éditoriale : certaines cartes occupent deux colonnes / deux rangées pour casser le rythme. */
const LAYOUT: Record<number, { cls: string; size: 'large' | 'wide' }> = {
  0: { cls: 'lg:col-span-2 lg:row-span-2', size: 'large' },
};

const QUICK = ['all', ...Object.keys(FINISHES)];

export function FindYourFrame() {
  const [finish, setFinish] = useState('all');
  const list = finish === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.finish === finish);
  return (
    <section className="on-light relative bg-paper py-24 text-ink sm:py-32" aria-labelledby="fyf-title">
      <div className="container-x">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow mb-5 text-black/50">La collection — {PRODUCTS.length} coloris</p>
            <SplitLines lines={['Find your', <span key="f" className="text-electric">frame.</span>]} className="display text-[18vw] sm:text-[12vw] lg:text-[9vw]" />
          </div>
          <div className="lg:max-w-md">
            <p className="text-lg text-black/65">Une forme ronde au pont en trou de serrure, déclinée en {PRODUCTS.length} coloris : écaille, translucide, dégradé ou noir brillant. Toutes à 29,90 €.</p>
            <div role="tablist" aria-label="Filtrer par finition" className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
              {QUICK.map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={finish === s}
                  onClick={() => setFinish(s)}
                  className={`shrink-0 rounded-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] transition ${
                    finish === s ? 'bg-ink text-paper' : 'bg-black/5 hover:bg-black/10'
                  }`}
                >
                  {s === 'all' ? 'Tout' : FINISHES[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-flow-dense lg:grid-cols-4">
          {list.map((p, i) => (
            <div key={p.id} className={finish === 'all' ? (LAYOUT[i]?.cls ?? '') : ''}>
              <ProductCard product={p} index={i} size={finish === 'all' ? (LAYOUT[i]?.size ?? 'normal') : 'normal'} />
            </div>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <Link to={finish === 'all' ? '/collection' : `/collection?finition=${finish}`} className="btn-ink">
            Voir toute la collection <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
