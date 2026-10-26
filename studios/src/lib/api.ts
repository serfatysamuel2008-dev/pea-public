// Appels au serveur de paiement (server/index.mjs).
import type { CartLine } from './pricing.ts';
import type { CustomerForm } from './checkout.ts';

const API = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

export type PaymentConfig = { stripe: boolean };

/** null = serveur injoignable (site statique) → mode démonstration. */
export async function getPaymentConfig(): Promise<PaymentConfig | null> {
  try {
    const r = await fetch(`${API}/config`, { headers: { accept: 'application/json' } });
    if (!r.ok || !r.headers.get('content-type')?.includes('json')) return null;
    return (await r.json()) as PaymentConfig;
  } catch {
    return null;
  }
}

export async function createCheckoutSession(lines: CartLine[], customer: CustomerForm): Promise<{ url: string }> {
  const r = await fetch(`${API}/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lines, customer }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || typeof data.url !== 'string') {
    throw new Error(data.error ?? 'Le paiement n’a pas pu démarrer. Réessaie dans un instant.');
  }
  return data;
}

export type OrderStatus = {
  paid: boolean;
  status: string;
  email: string | null;
  totalCents: number | null;
  reference: string;
  items: { name: string; qty: number }[];
};

export async function getOrderStatus(sessionId: string): Promise<OrderStatus> {
  const r = await fetch(`${API}/order?session_id=${encodeURIComponent(sessionId)}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? 'Impossible de vérifier le paiement.');
  return data as OrderStatus;
}
