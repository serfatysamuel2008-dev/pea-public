import { AnimatePresence, motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { COLORS, PRODUCTS, SHAPES, STYLES } from '../data/products.ts';
import { facetCounts, filterProducts, paramsFromQuery, queryFromParams, type CatalogQuery, type SortKey } from '../lib/catalog.ts';
import { useSeo } from '../lib/seo.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { ProductCard } from '../components/product/ProductCard.tsx';

type FacetKey = 'shapes' | 'colors' | 'styles';

const FACETS: { key: FacetKey; field: 'shape' | 'color' | 'style'; label: string; labels: Record<string, string> }[] = [
  { key: 'shapes', field: 'shape', label: 'Forme', labels: SHAPES },
  { key: 'colors', field: 'color', label: 'Couleur', labels: Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, v.label])) },
  { key: 'styles', field: 'style', label: 'Style', labels: STYLES },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Sélection' },
  { value: 'new', label: 'Nouveautés' },
  { value: 'name', label: 'Nom (A → Z)' },
];

function Filters({ query, update }: { query: CatalogQuery; update: (q: Partial<CatalogQuery>) => void }) {
  return (
    <div className="space-y-8">
      {FACETS.map((f) => {
        const counts = facetCounts(PRODUCTS, f.field);
        return (
          <fieldset key={f.key}>
            <legend className="eyebrow mb-3 text-black/50">{f.label}</legend>
            <div className="flex flex-wrap gap-2">
              {[...counts.keys()].map((value) => {
                const active = query[f.key].includes(value);
                const swatch = f.key === 'colors' ? COLORS[value]?.swatch : undefined;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ [f.key]: active ? query[f.key].filter((v) => v !== value) : [...query[f.key], value] })}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition ${active ? 'bg-ink text-paper' : 'bg-black/5 hover:bg-black/10'}`}
                  >
                    {swatch && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ background: swatch }} />}
                    {f.labels[value]}
                    <span className="font-mono text-[10px] opacity-50">{counts.get(value)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export default function Collection() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => queryFromParams(params), [params]);
  const [text, setText] = useState(query.q);
  const [drawer, setDrawer] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => filterProducts(PRODUCTS, query), [query]);
  const activeCount = query.shapes.length + query.colors.length + query.styles.length;

  useSeo({
    title: 'Collection',
    description: `Toutes les lunettes de soleil STUDIOS : ${PRODUCTS.length} modèles à 29,90 €. Filtre par forme, couleur et style.`,
  });

  const update = (patch: Partial<CatalogQuery>) => setParams(paramsFromQuery({ ...query, ...patch }), { replace: true });

  // Recherche avec un léger délai pour ne pas recalculer à chaque frappe.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (text !== query.q) update({ q: text });
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (params.get('focus') === 'recherche') searchRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = drawer ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [drawer]);

  const reset = () => {
    setText('');
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <PageShell tone="light">
      <section className="container-x pb-24 pt-32 sm:pt-40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h1 className="display text-[19vw] sm:text-[11vw] lg:text-[8vw]">
            Find your <span className="text-electric">frame.</span>
          </h1>
          <p className="max-w-sm text-black/60">
            {PRODUCTS.length} modèles, tous à <strong className="text-ink">29,90 €</strong>. Filtre par forme, couleur ou style, ou cherche un nom.
          </p>
        </div>

        {/* Barre d'outils */}
        <div className="sticky top-[76px] z-30 -mx-4 mt-10 flex flex-wrap items-center gap-2 bg-paper/85 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:px-2">
          <label className="relative min-w-0 flex-1 basis-full sm:basis-64">
            <span className="sr-only">Rechercher un modèle</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              ref={searchRef}
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Rechercher : aviateur, rose, CHROME…"
              className="field rounded-full py-3 pl-11"
            />
          </label>
          <button type="button" onClick={() => setDrawer(true)} className="flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm text-paper lg:hidden" aria-haspopup="dialog">
            <SlidersHorizontal size={16} /> Filtres {activeCount > 0 && <span className="rounded-full bg-volt px-1.5 font-mono text-[10px] text-ink">{activeCount}</span>}
          </button>
          <label className="ml-auto flex h-12 items-center gap-2 rounded-full bg-black/5 pl-4 pr-2 text-sm">
            <span className="text-black/50">Trier</span>
            <select value={query.sort} onChange={(e) => update({ sort: e.target.value as SortKey })} className="h-full cursor-pointer rounded-full bg-transparent pr-2 font-bold outline-none">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block" aria-label="Filtres">
            <div className="sticky top-44">
              <Filters query={query} update={update} />
              {(activeCount > 0 || query.q) && (
                <button type="button" onClick={reset} className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] underline underline-offset-4">
                  Tout effacer
                </button>
              )}
            </div>
          </aside>

          <div>
            <p className="mb-4 font-mono text-xs text-black/50" aria-live="polite">
              {results.length} modèle{results.length > 1 ? 's' : ''}
            </p>
            {results.length === 0 ? (
              <div className="grid place-items-center rounded-[28px] bg-black/[0.04] px-6 py-24 text-center">
                <p className="display text-5xl">Aucune paire trouvée.</p>
                <p className="mt-3 text-black/60">Essaie une autre forme ou un autre mot-clé.</p>
                <button type="button" onClick={reset} className="btn-ink mt-8">Réinitialiser</button>
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {results.map((p, i) => (
                    <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.35 }}>
                      <ProductCard product={p} index={i} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Filtres mobile */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtres">
            <motion.div className="absolute inset-0 bg-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-[28px] bg-paper p-6 pb-[max(env(safe-area-inset-bottom),24px)] text-ink"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <p className="display text-4xl">Filtres</p>
                <button type="button" onClick={() => setDrawer(false)} className="grid h-11 w-11 place-items-center rounded-full bg-black/5" aria-label="Fermer les filtres">
                  <X size={20} />
                </button>
              </div>
              <Filters query={query} update={update} />
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={reset} className="btn flex-1 bg-black/5">Effacer</button>
                <button type="button" onClick={() => setDrawer(false)} className="btn-ink flex-[2]">
                  Voir {results.length} modèle{results.length > 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
