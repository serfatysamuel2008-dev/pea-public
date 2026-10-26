// Serveur de la boutique : API de paiement Stripe + fichiers du site compilé (dist/).
// Le catalogue et les règles de prix sont importés depuis src/ : une seule source de vérité,
// le navigateur n'envoie que des identifiants et des quantités, jamais de prix.
import { appendFile, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { cartTotals, sanitizeCart } from '../src/lib/pricing.ts';
import { validateCustomer } from '../src/lib/checkout.ts';
import { SHIPPING_METHODS, CURRENCY } from '../src/data/shop.ts';

const MAX_BODY = 32 * 1024;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Requête trop volumineuse.'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Construit la session Stripe Checkout à partir du panier (prix recalculés ici). */
export function buildSessionParams({ lines, customer }, publicUrl) {
  const cart = sanitizeCart(lines);
  if (!cart.length) throw Object.assign(new Error('Ton panier est vide.'), { status: 400 });
  const errors = validateCustomer(customer ?? {});
  if (Object.keys(errors).length) {
    throw Object.assign(new Error(Object.values(errors)[0]), { status: 400, fields: errors });
  }
  const totals = cartTotals(cart, customer.shippingMethod);
  const method = SHIPPING_METHODS.find((m) => m.id === customer.shippingMethod);
  const currency = CURRENCY.toLowerCase();
  const name = `${customer.firstName.trim()} ${customer.lastName.trim()}`;
  return {
    mode: 'payment',
    locale: 'fr',
    customer_email: customer.email.trim(),
    line_items: totals.lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        currency,
        unit_amount: l.unitCents,
        product_data: {
          name: `STUDIOS ${l.product.name}`,
          description: `${l.product.frameLabel} · verres ${l.product.lensLabel.toLowerCase()}`,
          images: [`${publicUrl}/products/${l.product.slug}-front-sm.webp`],
          metadata: { productId: l.product.id },
        },
      },
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: method.label,
          fixed_amount: { amount: method.priceCents, currency },
        },
      },
    ],
    payment_intent_data: {
      shipping: {
        name,
        phone: customer.phone?.trim() || undefined,
        address: {
          line1: customer.address.trim(),
          line2: customer.address2?.trim() || undefined,
          postal_code: customer.postalCode.trim(),
          city: customer.city.trim(),
          country: customer.country,
        },
      },
    },
    metadata: {
      shippingMethod: method.id,
      cart: JSON.stringify(cart.map((l) => [l.productId, l.qty])).slice(0, 500),
    },
    success_url: `${publicUrl}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicUrl}/commande`,
  };
}

export function createHandler({ stripe, publicUrl, webhookSecret, distDir, ordersFile }) {
  const root = distDir ? resolve(distDir) : null;

  async function serveStatic(req, res) {
    if (!root) return send(res, 404, { error: 'Introuvable.' });
    const url = new URL(req.url, 'http://x');
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    let file = join(root, rel);
    if (!file.startsWith(root)) return send(res, 403, { error: 'Interdit.' });
    try {
      if (!(await stat(file)).isFile()) throw new Error();
    } catch {
      file = join(root, 'index.html'); // application monopage : le routeur du site prend le relais
    }
    const body = await readFile(file);
    const immutable = file.includes(`${join(root, 'assets')}`);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  }

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname === '/api/config' && req.method === 'GET') {
        return send(res, 200, { stripe: !!stripe });
      }

      if (url.pathname === '/api/checkout' && req.method === 'POST') {
        if (!stripe) return send(res, 503, { error: 'Le paiement n’est pas configuré (mode démonstration).' });
        let payload;
        try {
          payload = JSON.parse((await readBody(req)).toString('utf8'));
        } catch (e) {
          return send(res, e.status ?? 400, { error: e.status ? e.message : 'Requête invalide.' });
        }
        let params;
        try {
          params = buildSessionParams(payload, publicUrl);
        } catch (e) {
          return send(res, e.status ?? 400, { error: e.message, fields: e.fields });
        }
        const session = await stripe.checkout.sessions.create(params);
        return send(res, 200, { url: session.url });
      }

      if (url.pathname === '/api/order' && req.method === 'GET') {
        if (!stripe) return send(res, 503, { error: 'Le paiement n’est pas configuré.' });
        const id = url.searchParams.get('session_id') ?? '';
        if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(id)) return send(res, 400, { error: 'Référence de paiement invalide.' });
        let session;
        try {
          session = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items'] });
        } catch {
          return send(res, 404, { error: 'Paiement introuvable.' });
        }
        const paid = session.status === 'complete' && session.payment_status === 'paid';
        return send(res, 200, {
          paid,
          status: session.payment_status ?? session.status,
          email: paid ? (session.customer_details?.email ?? session.customer_email ?? null) : null,
          totalCents: paid ? session.amount_total : null,
          reference: id.slice(-8).toUpperCase(),
          items: paid ? (session.line_items?.data ?? []).map((li) => ({ name: li.description, qty: li.quantity })) : [],
        });
      }

      if (url.pathname === '/api/stripe/webhook' && req.method === 'POST') {
        if (!stripe || !webhookSecret) return send(res, 503, { error: 'Webhook non configuré.' });
        const raw = await readBody(req);
        let event;
        try {
          event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], webhookSecret);
        } catch {
          return send(res, 400, { error: 'Signature invalide.' });
        }
        if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
          const s = event.data.object;
          if (s.payment_status === 'paid' && ordersFile) {
            // Journal minimal des commandes payées. À remplacer par une base de données / un OMS.
            await appendFile(ordersFile, `${JSON.stringify({ at: new Date().toISOString(), session: s.id, email: s.customer_details?.email, total: s.amount_total, cart: s.metadata?.cart })}\n`);
          }
        }
        return send(res, 200, { received: true });
      }

      if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Route inconnue.' });
      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
      return send(res, 405, { error: 'Méthode non autorisée.' });
    } catch (e) {
      console.error(e);
      return send(res, 500, { error: 'Une erreur est survenue. Réessaie dans un instant.' });
    }
  };
}
