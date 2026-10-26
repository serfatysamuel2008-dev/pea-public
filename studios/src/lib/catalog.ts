// Recherche, filtres et tri du catalogue (fonctions pures, testées).
import { COLORS, SHAPES, STYLES, type Product } from '../data/products.ts';

export type SortKey = 'featured' | 'new' | 'name';

export type CatalogQuery = {
  q: string;
  shapes: string[];
  colors: string[];
  styles: string[];
  sort: SortKey;
};

export const EMPTY_QUERY: CatalogQuery = { q: '', shapes: [], colors: [], styles: [], sort: 'featured' };

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function haystack(p: Product) {
  return normalize(
    [p.name, p.tagline, p.description, SHAPES[p.shape], COLORS[p.color]?.label, STYLES[p.style], p.frameLabel, p.lensLabel].join(' '),
  );
}

export function filterProducts(products: Product[], query: CatalogQuery): Product[] {
  const terms = normalize(query.q).split(/\s+/).filter(Boolean);
  const out = products.filter((p) => {
    if (query.shapes.length && !query.shapes.includes(p.shape)) return false;
    if (query.colors.length && !query.colors.includes(p.color)) return false;
    if (query.styles.length && !query.styles.includes(p.style)) return false;
    if (terms.length) {
      const h = haystack(p);
      if (!terms.every((t) => h.includes(t))) return false;
    }
    return true;
  });
  switch (query.sort) {
    case 'new':
      return [...out].sort((a, b) => b.drop - a.drop);
    case 'name':
      return [...out].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    default:
      return out;
  }
}

/** Valeurs de filtres réellement présentes dans le catalogue, avec leur nombre de modèles. */
export function facetCounts(products: Product[], key: 'shape' | 'color' | 'style') {
  const counts = new Map<string, number>();
  products.forEach((p) => counts.set(p[key], (counts.get(p[key]) ?? 0) + 1));
  return counts;
}

/** Modèles proches : même style ou même forme d'abord. */
export function similarProducts(products: Product[], current: Product, count = 4): Product[] {
  const score = (p: Product) => (p.style === current.style ? 2 : 0) + (p.shape === current.shape ? 1 : 0);
  return products
    .filter((p) => p.id !== current.id)
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, count)
    .map((x) => x.p);
}

export function queryFromParams(params: URLSearchParams): CatalogQuery {
  const list = (k: string) => (params.get(k) ?? '').split(',').filter(Boolean);
  const sort = params.get('tri');
  return {
    q: params.get('q') ?? '',
    shapes: list('forme').filter((s) => s in SHAPES),
    colors: list('couleur').filter((s) => s in COLORS),
    styles: list('style').filter((s) => s in STYLES),
    sort: sort === 'new' || sort === 'name' ? sort : 'featured',
  };
}

export function paramsFromQuery(q: CatalogQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set('q', q.q);
  if (q.shapes.length) p.set('forme', q.shapes.join(','));
  if (q.colors.length) p.set('couleur', q.colors.join(','));
  if (q.styles.length) p.set('style', q.styles.join(','));
  if (q.sort !== 'featured') p.set('tri', q.sort);
  return p;
}
