// Calculs du panier. Toujours repartir du catalogue : le prix n'est jamais stocké dans le panier.
import { getProductById, type Product } from '../data/products.ts';
import { MAX_QTY_PER_LINE, SHIPPING_METHODS } from '../data/shop.ts';

export type CartLine = { productId: string; variantId?: string; qty: number };

export type PricedLine = CartLine & { product: Product; unitCents: number; totalCents: number };

export function lineKey(l: Pick<CartLine, 'productId' | 'variantId'>) {
  return l.variantId ? `${l.productId}:${l.variantId}` : l.productId;
}

export function clampQty(qty: number) {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.round(qty)));
}

/** Nettoie un panier relu depuis le stockage (produits retirés, quantités invalides, doublons). */
export function sanitizeCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const map = new Map<string, CartLine>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { productId, variantId, qty } = item as Partial<CartLine>;
    if (typeof productId !== 'string') continue;
    const product = getProductById(productId);
    if (!product) continue;
    if (variantId !== undefined && !product.variants.some((v) => v.id === variantId)) continue;
    const line: CartLine = { productId, variantId, qty: clampQty(Number(qty)) };
    const key = lineKey(line);
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, qty: clampQty(prev.qty + line.qty) } : line);
  }
  return [...map.values()];
}

export function priceLines(lines: CartLine[]): PricedLine[] {
  return lines.flatMap((l) => {
    const product = getProductById(l.productId);
    if (!product) return [];
    return [{ ...l, product, unitCents: product.priceCents, totalCents: product.priceCents * l.qty }];
  });
}

export function cartTotals(lines: CartLine[], shippingMethodId?: string | null) {
  const priced = priceLines(lines);
  const subtotalCents = priced.reduce((s, l) => s + l.totalCents, 0);
  const count = priced.reduce((s, l) => s + l.qty, 0);
  const method = SHIPPING_METHODS.find((m) => m.id === shippingMethodId) ?? null;
  const shippingCents = method && count > 0 ? method.priceCents : null;
  return {
    lines: priced,
    count,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + (shippingCents ?? 0),
  };
}
