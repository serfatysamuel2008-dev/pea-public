import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../data/products.ts';
import { SHIPPING_METHODS, UNIT_PRICE_CENTS } from '../data/shop.ts';
import { cartReducer } from '../store/cart.tsx';
import { cartTotals, clampQty, sanitizeCart } from './pricing.ts';
import { formatPrice } from './format.ts';

describe('catalogue', () => {
  it('propose au moins 12 modèles, tous au prix unique', () => {
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(12);
    for (const p of PRODUCTS) expect(p.priceCents).toBe(UNIT_PRICE_CENTS);
  });
  it('a des identifiants et des URL uniques', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(PRODUCTS.length);
    for (const p of PRODUCTS) expect(p.slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('prix', () => {
  it('affiche 29,90 €', () => {
    expect(formatPrice(2990)).toBe('29,90 €');
  });
  it('calcule sous-total, livraison et total', () => {
    const t = cartTotals(
      [
        { productId: 'chrome', qty: 2 },
        { productId: 'neon', qty: 1 },
      ],
      SHIPPING_METHODS[0].id,
    );
    expect(t.count).toBe(3);
    expect(t.subtotalCents).toBe(3 * 2990);
    expect(t.shippingCents).toBe(SHIPPING_METHODS[0].priceCents);
    expect(t.totalCents).toBe(3 * 2990 + SHIPPING_METHODS[0].priceCents);
  });
  it('ne compte pas de livraison sans mode choisi ni sur un panier vide', () => {
    expect(cartTotals([{ productId: 'chrome', qty: 1 }]).shippingCents).toBeNull();
    expect(cartTotals([], SHIPPING_METHODS[0].id).shippingCents).toBeNull();
  });
});

describe('panier', () => {
  it('borne les quantités entre 1 et 10', () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(99)).toBe(10);
    expect(clampQty(Number.NaN)).toBe(1);
    expect(clampQty(2.6)).toBe(3);
  });
  it('nettoie un panier relu depuis le stockage', () => {
    expect(sanitizeCart('nimporte quoi')).toEqual([]);
    expect(
      sanitizeCart([
        { productId: 'chrome', qty: 2 },
        { productId: 'chrome', qty: 3 },
        { productId: 'inconnu', qty: 1 },
        { productId: 'neon', qty: -4 },
        null,
        { productId: 'volt', qty: 1, variantId: 'pas-une-variante' },
      ]),
    ).toEqual([
      { productId: 'chrome', variantId: undefined, qty: 5 },
      { productId: 'neon', variantId: undefined, qty: 1 },
    ]);
  });
  it('ajoute, modifie et supprime des lignes', () => {
    let s = cartReducer([], { type: 'add', line: { productId: 'retro', qty: 1 } });
    s = cartReducer(s, { type: 'add', line: { productId: 'retro', qty: 2 } });
    expect(s).toEqual([{ productId: 'retro', qty: 3 }]);
    s = cartReducer(s, { type: 'setQty', key: 'retro', qty: 50 });
    expect(s[0].qty).toBe(10);
    s = cartReducer(s, { type: 'add', line: { productId: 'pebble', qty: 1 } });
    s = cartReducer(s, { type: 'remove', key: 'retro' });
    expect(s.map((l) => l.productId)).toEqual(['pebble']);
    expect(cartReducer(s, { type: 'clear' })).toEqual([]);
  });
});
