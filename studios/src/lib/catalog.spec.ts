import { describe, expect, it } from 'vitest';
import { PRODUCTS, getProduct } from '../data/products.ts';
import { EMPTY_QUERY, filterProducts, paramsFromQuery, queryFromParams, similarProducts } from './catalog.ts';

describe('recherche et filtres', () => {
  it('cherche sans tenir compte des accents ni de la casse', () => {
    expect(filterProducts(PRODUCTS, { ...EMPTY_QUERY, q: 'ECAILLE' }).map((p) => p.id)).toEqual(['midnight', 'cherry', 'rosewood', 'havana']);
    expect(filterProducts(PRODUCTS, { ...EMPTY_QUERY, q: 'champagne' }).map((p) => p.id)).toEqual(['champagne']);
  });
  it('combine monture, verres et finition', () => {
    expect(filterProducts(PRODUCTS, { ...EMPTY_QUERY, frames: ['noir'], lenses: ['fume'] }).map((p) => p.id)).toEqual(['fade', 'shadow']);
    expect(filterProducts(PRODUCTS, { ...EMPTY_QUERY, finishes: ['degrade'] }).map((p) => p.id)).toEqual(['fade', 'ocean']);
    expect(filterProducts(PRODUCTS, { ...EMPTY_QUERY, lenses: ['bleu'] }).every((p) => p.lens === 'bleu')).toBe(true);
  });
  it('trie par nouveauté et par nom', () => {
    const byNew = filterProducts(PRODUCTS, { ...EMPTY_QUERY, sort: 'new' });
    expect(byNew[0].drop).toBe(Math.max(...PRODUCTS.map((p) => p.drop)));
    const byName = filterProducts(PRODUCTS, { ...EMPTY_QUERY, sort: 'name' }).map((p) => p.name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b, 'fr')));
  });
  it('garde les filtres dans l’URL et ignore les valeurs inconnues', () => {
    const q = { ...EMPTY_QUERY, q: 'bleu', frames: ['noir'], finishes: ['ecaille'], sort: 'new' as const };
    expect(queryFromParams(paramsFromQuery(q))).toEqual(q);
    expect(queryFromParams(new URLSearchParams('verres=violet,ambre&tri=prix'))).toEqual({ ...EMPTY_QUERY, lenses: ['ambre'] });
  });
  it('propose des coloris proches sans le coloris courant', () => {
    const current = getProduct('havana')!;
    const sim = similarProducts(PRODUCTS, current, 4);
    expect(sim).toHaveLength(4);
    expect(sim.find((p) => p.id === current.id)).toBeUndefined();
    expect(sim[0].finish).toBe(current.finish);
  });
});
