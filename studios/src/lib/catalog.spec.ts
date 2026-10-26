import { describe, expect, it } from 'vitest';
import { PRODUCTS, getProduct } from '../data/products.ts';
import { EMPTY_QUERY, filterProducts, paramsFromQuery, queryFromParams, similarProducts } from './catalog.ts';

describe('recherche et filtres', () => {
  it('cherche sans tenir compte des accents ni de la casse', () => {
    expect(filterProducts(PRODUCTS, { ...EMPTY_QUERY, q: 'ECAILLE' }).map((p) => p.id)).toContain('havana');
    expect(filterProducts(PRODUCTS, { ...EMPTY_QUERY, q: 'chrome' }).map((p) => p.id)).toEqual(['chrome']);
  });
  it('combine forme, couleur et style', () => {
    const r = filterProducts(PRODUCTS, { ...EMPTY_QUERY, colors: ['noir'], styles: ['retro'] });
    expect(r.map((p) => p.id)).toEqual(['pebble']);
    expect(filterProducts(PRODUCTS, { ...EMPTY_QUERY, shapes: ['aviateur'] }).every((p) => p.shape === 'aviateur')).toBe(true);
  });
  it('trie par nouveauté et par nom', () => {
    const byNew = filterProducts(PRODUCTS, { ...EMPTY_QUERY, sort: 'new' });
    expect(byNew[0].drop).toBe(Math.max(...PRODUCTS.map((p) => p.drop)));
    const byName = filterProducts(PRODUCTS, { ...EMPTY_QUERY, sort: 'name' }).map((p) => p.name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b, 'fr')));
  });
  it('garde les filtres dans l’URL et ignore les valeurs inconnues', () => {
    const q = { ...EMPTY_QUERY, q: 'rose', shapes: ['cat-eye'], sort: 'new' as const };
    expect(queryFromParams(paramsFromQuery(q))).toEqual(q);
    expect(queryFromParams(new URLSearchParams('forme=triangle,ronde&tri=prix'))).toEqual({ ...EMPTY_QUERY, shapes: ['ronde'] });
  });
  it('propose des modèles similaires sans le modèle courant', () => {
    const current = getProduct('afterhours')!;
    const sim = similarProducts(PRODUCTS, current, 4);
    expect(sim).toHaveLength(4);
    expect(sim.find((p) => p.id === current.id)).toBeUndefined();
    expect(sim[0].style === current.style || sim[0].shape === current.shape).toBe(true);
  });
});
