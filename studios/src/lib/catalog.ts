// Recherche, filtres et tri du catalogue (fonctions pures, testées).
import { FINISHES, FRAME_COLORS, LENS_TINTS, SHAPE_LABEL, type Product } from '../data/products.ts';

export type SortKey = 'featured' | 'new' | 'name';

export type CatalogQuery = {
  q: string;
  frames: string[];
  lenses: string[];
  finishes: string[];
  sort: SortKey;
};

export const EMPTY_QUERY: CatalogQuery = { q: '', frames: [], lenses: [], finishes: [], sort: 'featured' };

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function haystack(p: Product) {
  return normalize(
    [p.name, p.tagline, p.description, SHAPE_LABEL, FRAME_COLORS[p.frame]?.label, LENS_TINTS[p.lens]?.label, FINISHES[p.finish], p.frameLabel, p.lensLabel].join(' '),
  );
}

export function filterProducts(products: Product[], query: CatalogQuery): Product[] {
  const terms = normalize(query.q).split(/\s+/).filter(Boolean);
  const out = products.filter((p) => {
    if (query.frames.length && !query.frames.includes(p.frame)) return false;
    if (query.lenses.length && !query.lenses.includes(p.lens)) return false;
    if (query.finishes.length && !query.finishes.includes(p.finish)) return false;
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

/** Valeurs de filtres réellement présentes dans le catalogue, avec leur nombre de coloris. */
export function facetCounts(products: Product[], key: 'frame' | 'lens' | 'finish') {
  const counts = new Map<string, number>();
  products.forEach((p) => counts.set(p[key], (counts.get(p[key]) ?? 0) + 1));
  return counts;
}

/** Coloris proches : même finition ou mêmes verres d'abord. */
export function similarProducts(products: Product[], current: Product, count = 4): Product[] {
  const score = (p: Product) => (p.finish === current.finish ? 2 : 0) + (p.lens === current.lens ? 1 : 0);
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
    frames: list('monture').filter((s) => s in FRAME_COLORS),
    lenses: list('verres').filter((s) => s in LENS_TINTS),
    finishes: list('finition').filter((s) => s in FINISHES),
    sort: sort === 'new' || sort === 'name' ? sort : 'featured',
  };
}

export function paramsFromQuery(q: CatalogQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set('q', q.q);
  if (q.frames.length) p.set('monture', q.frames.join(','));
  if (q.lenses.length) p.set('verres', q.lenses.join(','));
  if (q.finishes.length) p.set('finition', q.finishes.join(','));
  if (q.sort !== 'featured') p.set('tri', q.sort);
  return p;
}
