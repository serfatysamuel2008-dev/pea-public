// Démarrage : node server/index.mjs (Node 22.18+ pour l'import direct des fichiers .ts du catalogue).
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHandler } from './app.mjs';

// Charge studios/.env s'il existe (sans dépendance).
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const key = process.env.STRIPE_SECRET_KEY;
let stripe = null;
if (key && /^sk_(test|live)_/.test(key)) {
  const { default: Stripe } = await import('stripe');
  stripe = new Stripe(key);
}

const port = Number(process.env.PORT ?? 8787);
const publicUrl = (process.env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, '');
const distDir = fileURLToPath(new URL('../dist', import.meta.url));

createServer(
  createHandler({
    stripe,
    publicUrl,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    distDir: existsSync(distDir) ? distDir : null,
    ordersFile: fileURLToPath(new URL('./orders.jsonl', import.meta.url)),
  }),
).listen(port, () => {
  console.log(`STUDIOS — http://localhost:${port}`);
  console.log(stripe ? `Paiement Stripe actif (${key.startsWith('sk_live_') ? 'PRODUCTION' : 'test'}).` : 'Paiement non configuré : mode démonstration (STRIPE_SECRET_KEY absent).');
});
