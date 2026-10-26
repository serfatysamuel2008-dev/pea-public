// Test de bout en bout du parcours d'achat (Playwright).
// Prérequis : `npm run dev` (et facultativement `npm run server`). Usage : npm run e2e
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));
const BASE = process.env.E2E_URL ?? 'http://localhost:5173';
// Rendu 3D léger : les navigateurs de test n'ont pas de carte graphique.
const Q = '?qualite=legere';
const browser = await chromium.launch();
const errors = [];

async function newPage(viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}

const step = (name) => console.log(`✓ ${name}`);

// 1. Ajout depuis la fiche produit, panier, quantités, persistance.
{
  const page = await newPage();
  await page.goto(`${BASE}/produit/deep-blue${Q}`);
  await page.getByRole('heading', { level: 1, name: 'DEEP BLUE' }).waitFor();
  assert.ok(await page.getByText('29,90 €').first().isVisible());
  step('fiche produit affichée avec son prix');

  await page.getByRole('button', { name: 'Ajouter une paire' }).first().click();
  await page.getByRole('button', { name: /Ajouter au panier/ }).click();
  await page.getByRole('button', { name: /Ouvrir le panier \(2 articles\)/ }).waitFor();
  step('ajout de 2 paires, compteur du panier à jour');

  await page.goto(`${BASE}/produit/havana${Q}`);
  await page.getByRole('button', { name: /Ajouter au panier/ }).click();
  await page.getByRole('button', { name: /Ouvrir le panier/ }).click();
  const drawer = page.getByRole('dialog', { name: /Panier/ });
  await drawer.waitFor();
  assert.match(await drawer.textContent(), /89,70/);
  step('panier : sous-total 3 × 29,90 € = 89,70 €');

  await drawer.getByRole('button', { name: 'Ajouter une paire' }).first().click();
  assert.match(await drawer.textContent(), /119,60/);
  await drawer.getByRole('button', { name: 'Supprimer HAVANA du panier' }).click();
  await page.waitForTimeout(400);
  assert.match(await drawer.textContent(), /89,70/);
  step('quantité modifiée et ligne supprimée, totaux recalculés');

  await page.reload();
  await page.getByRole('button', { name: /Ouvrir le panier \(3 articles\)/ }).waitFor();
  step('panier conservé après rafraîchissement');

  await page.getByRole('button', { name: /Ouvrir le panier/ }).click();
  await page.getByRole('button', { name: 'Passer commande' }).click();
  await page.waitForURL(/\/commande$/);

  // 2. Formulaire de commande.
  await page.getByRole('button', { name: /Payer|Vérifier ma commande/ }).click();
  assert.ok(await page.getByText('Ton prénom est requis.').isVisible());
  step('formulaire : erreurs affichées sur les champs vides');

  await page.getByLabel('E-mail').fill('lea@example.com');
  await page.getByLabel('Prénom').fill('Léa');
  await page.getByLabel('Nom', { exact: true }).fill('Martin');
  await page.getByLabel('Adresse', { exact: true }).fill('12 rue de la Paix');
  await page.getByLabel('Code postal').fill('75002');
  await page.getByLabel('Ville').fill('Paris');
  await page.getByText('Livraison à domicile').click();
  const summary = page.getByRole('complementary', { name: 'Récapitulatif' });
  assert.match(await summary.textContent(), /89,70[\s\S]*5,90[\s\S]*95,60/);
  step('récapitulatif : 89,70 € + 5,90 € de livraison = 95,60 €');

  const config = await page.evaluate(() => fetch('/api/config').then((r) => (r.ok ? r.json() : null)).catch(() => null));
  if (!config?.stripe) {
    await page.getByRole('button', { name: /Vérifier ma commande/ }).click();
    await page.getByText(/aucune commande n’a été créée/).waitFor();
    step('mode démonstration : aucune commande simulée');
  }
  await page.context().close();
}

// 3. Paiement confirmé par le prestataire (réponses Stripe simulées dans le navigateur).
{
  const page = await newPage({ width: 390, height: 844 });
  await page.route('**/api/config', (r) => r.fulfill({ json: { stripe: true } }));
  await page.route('**/api/checkout', (r) => r.fulfill({ json: { url: `${BASE}/commande/confirmation?session_id=cs_test_e2eAAAAAAAAPAID` } }));
  await page.route('**/api/order?*', (r) => {
    const paid = r.request().url().endsWith('PAID');
    r.fulfill({ json: paid ? { paid: true, status: 'paid', email: 'lea@example.com', totalCents: 3380, reference: 'AAAAPAID', items: [{ name: 'STUDIOS OCEAN', qty: 1 }] } : { paid: false, status: 'unpaid', email: null, totalCents: null, reference: 'X', items: [] } });
  });
  await page.goto(`${BASE}/produit/ocean${Q}`);
  await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
  await page.goto(`${BASE}/commande`);
  await page.getByLabel('E-mail').fill('lea@example.com');
  await page.getByLabel('Prénom').fill('Léa');
  await page.getByLabel('Nom', { exact: true }).fill('Martin');
  await page.getByLabel('Adresse', { exact: true }).fill('12 rue de la Paix');
  await page.getByLabel('Code postal').fill('75002');
  await page.getByLabel('Ville').fill('Paris');
  await page.getByRole('button', { name: /Payer 33,80/ }).click();
  await page.getByRole('heading', { name: 'Merci !' }).waitFor();
  await page.getByRole('button', { name: /Ouvrir le panier \(0 article\)/ }).waitFor();
  step('mobile : paiement confirmé → page de confirmation, panier vidé');

  await page.goto(`${BASE}/commande/confirmation?session_id=cs_test_e2eUNPAIDxxxx`);
  await page.getByRole('heading', { name: 'Paiement non confirmé' }).waitFor();
  await page.goto(`${BASE}/commande/confirmation`);
  await page.getByRole('heading', { name: 'Rien à confirmer' }).waitFor();
  step('pas de confirmation sans paiement validé');
  await page.context().close();
}

// 4. Catalogue : recherche, filtres, menu mobile.
{
  const page = await newPage({ width: 390, height: 844 });
  await page.goto(`${BASE}/collection?finition=degrade`);
  await page.getByText('2 coloris', { exact: true }).waitFor();
  await page.goto(`${BASE}/collection`);
  await page.getByRole('searchbox').fill('zzzz');
  await page.getByText('Aucune paire trouvée.').waitFor();
  await page.getByRole('button', { name: 'Réinitialiser' }).click();
  await page.getByText('13 coloris', { exact: true }).waitFor();
  step('catalogue : filtre par URL, recherche vide, réinitialisation');

  for (const path of ['/', '/collection', '/produit/havana', '/produit/ocean', '/commande', '/faq', '/cgv', '/favoris', '/page-inconnue']) {
    await page.goto(`${BASE}${path}${path.startsWith('/produit') || path === '/' ? Q : ''}`);
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false, `défilement horizontal sur ${path}`);
  }
  step('mobile : aucune page ne déborde horizontalement');

  await page.goto(`${BASE}/collection`);
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'FAQ' }).click();
  await page.waitForURL(/\/faq$/);
  step('menu mobile');
  await page.context().close();
}

await browser.close();
if (errors.length) {
  console.error('Erreurs JavaScript :', errors);
  process.exit(1);
}
console.log('Parcours d’achat : OK');
