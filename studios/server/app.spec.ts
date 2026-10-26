import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
// @ts-expect-error module JavaScript sans types
import { buildSessionParams, createHandler } from './app.mjs';

const customer = {
  email: 'lea@example.com', firstName: 'Léa', lastName: 'Martin', phone: '', address: '12 rue de la Paix', address2: '',
  postalCode: '75002', city: 'Paris', country: 'FR', shippingMethod: 'relay',
};

function call(handler: (req: unknown, res: unknown) => Promise<void>, method: string, url: string, body?: unknown) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]) as Readable & { method: string; url: string; headers: object };
  req.method = method;
  req.url = url;
  req.headers = {};
  return new Promise<{ status: number; json: Record<string, unknown> }>((resolve) => {
    let status = 0;
    const res = {
      writeHead: (s: number) => (status = s),
      end: (data: string) => resolve({ status, json: data ? JSON.parse(data) : {} }),
    };
    handler(req, res);
  });
}

describe('serveur de paiement', () => {
  it('recalcule les prix côté serveur, sans faire confiance au navigateur', () => {
    const p = buildSessionParams({ lines: [{ productId: 'deep-blue', qty: 2, priceCents: 1 }], customer }, 'https://shop.test');
    expect(p.line_items).toHaveLength(1);
    expect(p.line_items[0].quantity).toBe(2);
    expect(p.line_items[0].price_data.unit_amount).toBe(2990);
    expect(p.shipping_options[0].shipping_rate_data.fixed_amount.amount).toBe(390);
    expect(p.success_url).toBe('https://shop.test/commande/confirmation?session_id={CHECKOUT_SESSION_ID}');
  });

  it('refuse un panier vide ou un formulaire invalide', () => {
    expect(() => buildSessionParams({ lines: [], customer }, 'x')).toThrow(/vide/);
    expect(() => buildSessionParams({ lines: [{ productId: 'deep-blue', qty: 1 }], customer: { ...customer, email: 'x' } }, 'x')).toThrow();
  });

  it('reste en mode démonstration sans clé Stripe', async () => {
    const h = createHandler({ stripe: null, publicUrl: 'x' });
    expect((await call(h, 'GET', '/api/config')).json).toEqual({ stripe: false });
    expect((await call(h, 'POST', '/api/checkout', { lines: [], customer })).status).toBe(503);
  });

  it('crée une session et ne confirme qu’un paiement réellement payé', async () => {
    const stripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_x' }),
          retrieve: vi.fn().mockImplementation(async (id: string) =>
            id.endsWith('PAID')
              ? { status: 'complete', payment_status: 'paid', amount_total: 6370, customer_details: { email: 'lea@example.com' }, line_items: { data: [{ description: 'STUDIOS DEEP BLUE', quantity: 2 }] } }
              : { status: 'open', payment_status: 'unpaid', amount_total: 6370 },
          ),
        },
      },
    };
    const h = createHandler({ stripe, publicUrl: 'https://shop.test' });
    const created = await call(h, 'POST', '/api/checkout', { lines: [{ productId: 'deep-blue', qty: 2 }], customer });
    expect(created.json.url).toContain('checkout.stripe.com');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledOnce();

    const paid = await call(h, 'GET', '/api/order?session_id=cs_test_abcdefPAID');
    expect(paid.json).toMatchObject({ paid: true, totalCents: 6370, items: [{ name: 'STUDIOS DEEP BLUE', qty: 2 }] });

    const unpaid = await call(h, 'GET', '/api/order?session_id=cs_test_abcdefghijk');
    expect(unpaid.json).toMatchObject({ paid: false, totalCents: null, email: null, items: [] });

    expect((await call(h, 'GET', '/api/order?session_id=../../etc')).status).toBe(400);
  });
});
