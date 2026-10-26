import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { SHIPPING_COUNTRIES, SHIPPING_METHODS, SHIPPING_RATES_CONFIRMED } from '../data/shop.ts';
import { createCheckoutSession } from '../lib/api.ts';
import { EMPTY_FORM, validateCustomer, type CustomerForm, type FormErrors } from '../lib/checkout.ts';
import { formatPrice } from '../lib/format.ts';
import { cartTotals, lineKey } from '../lib/pricing.ts';
import { readJSON, writeJSON } from '../lib/storage.ts';
import { useSeo } from '../lib/seo.ts';
import { usePaymentConfig } from '../lib/usePaymentConfig.ts';
import { useCart } from '../store/cart.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { ProductImage } from '../components/ui/ProductImage.tsx';

const DRAFT_KEY = 'studios.checkout.draft';

function Field({
  id, label, error, optional, ...rest
}: { id: keyof CustomerForm; label: string; error?: string; optional?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label} {optional && <span className="font-normal text-black/40">(facultatif)</span>}
      </label>
      <input id={id} name={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className={`field ${error ? 'field-error' : ''}`} {...rest} />
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-[#d4006e]">
          {error}
        </p>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[28px] bg-white p-5 ring-1 ring-black/5 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden className="mb-5 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-mono text-xs text-paper">{n}</span>
        <span className="display text-3xl">{title}</span>
      </div>
      {children}
    </fieldset>
  );
}

export default function Checkout() {
  useSeo({ title: 'Commande', description: 'Finalise ta commande STUDIOS.', noindex: true });
  const { items } = useCart();
  const payment = usePaymentConfig();
  const [form, setForm] = useState<CustomerForm>(() => ({ ...EMPTY_FORM, ...readJSON<Partial<CustomerForm>>(DRAFT_KEY, {}) }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoChecked, setDemoChecked] = useState(false);
  const totals = useMemo(() => cartTotals(items, form.shippingMethod), [items, form.shippingMethod]);
  const demo = payment === null || payment?.stripe === false;

  const set = (k: keyof CustomerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    // Brouillon conservé localement (sans données de paiement) pour ne rien perdre au rafraîchissement.
    writeJSON(DRAFT_KEY, next);
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
    setDemoChecked(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const errs = validateCustomer(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    if (demo) {
      setDemoChecked(true);
      return;
    }
    setSubmitting(true);
    try {
      const { url } = await createCheckoutSession(items, form);
      window.location.assign(url);
    } catch (err) {
      setServerError((err as Error).message);
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <PageShell tone="light">
        <div className="container-x grid min-h-[80svh] place-items-center pt-28 text-center">
          <div>
            <h1 className="display text-6xl sm:text-8xl">Panier vide.</h1>
            <p className="mt-4 text-black/60">Ajoute une paire avant de passer commande.</p>
            <Link to="/collection" className="btn-ink mt-8">Voir la collection</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell tone="light">
      <div className="min-h-screen bg-[#f2f2ee]">
        <div className="container-x pb-24 pt-28 sm:pt-32">
          <Link to="/collection" className="mb-6 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-black/50 hover:text-ink">
            <ArrowLeft size={14} /> Continuer mes achats
          </Link>
          <h1 className="display text-[16vw] sm:text-[8vw] lg:text-[6vw]">Commande</h1>

          {demo && payment !== undefined && (
            <div role="note" className="mt-6 flex gap-4 rounded-[24px] bg-volt p-5 text-ink">
              <AlertTriangle className="mt-0.5 shrink-0" size={20} />
              <div className="text-[15px]">
                <p className="font-bold">Mode démonstration : le paiement n’est pas encore connecté.</p>
                <p className="mt-1">
                  Tu peux tester le parcours, mais aucune commande ne sera passée et aucun paiement ne sera demandé. Pour activer les paiements, lance le serveur de la boutique avec une clé Stripe
                  (voir <code className="font-mono text-[13px]">studios/README.md</code>, section « Paiement »).
                </p>
              </div>
            </div>
          )}

          <form onSubmit={submit} noValidate className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
            <div className="space-y-4">
              <Step n={1} title="Coordonnées">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field id="email" label="E-mail" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} error={errors.email} />
                  </div>
                  <Field id="firstName" label="Prénom" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
                  <Field id="lastName" label="Nom" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
                  <div className="sm:col-span-2">
                    <Field id="phone" label="Téléphone" optional type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
                  </div>
                </div>
              </Step>

              <Step n={2} title="Adresse de livraison">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field id="address" label="Adresse" autoComplete="address-line1" value={form.address} onChange={set('address')} error={errors.address} />
                  </div>
                  <div className="sm:col-span-2">
                    <Field id="address2" label="Complément" optional autoComplete="address-line2" value={form.address2} onChange={set('address2')} />
                  </div>
                  <Field id="postalCode" label="Code postal" autoComplete="postal-code" inputMode="numeric" value={form.postalCode} onChange={set('postalCode')} error={errors.postalCode} />
                  <Field id="city" label="Ville" autoComplete="address-level2" value={form.city} onChange={set('city')} error={errors.city} />
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium">Pays</span>
                    <select id="country" value={form.country} onChange={set('country')} autoComplete="country" className={`field ${errors.country ? 'field-error' : ''}`}>
                      {SHIPPING_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </Step>

              <Step n={3} title="Livraison">
                <div role="radiogroup" aria-label="Mode de livraison" className="grid gap-3 sm:grid-cols-2">
                  {SHIPPING_METHODS.map((m) => {
                    const active = form.shippingMethod === m.id;
                    return (
                      <label key={m.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl p-4 ring-2 transition ${active ? 'bg-ink text-paper ring-ink' : 'bg-white ring-black/10 hover:ring-black/30'}`}>
                        <span className="flex items-center gap-3">
                          <input type="radio" name="shippingMethod" value={m.id} checked={active} onChange={set('shippingMethod')} className="h-4 w-4 accent-[#C6FF00]" />
                          <span>
                            <span className="block font-bold">{m.label}</span>
                            {m.delay && <span className="text-sm opacity-70">{m.delay}</span>}
                          </span>
                        </span>
                        <span className="font-mono text-sm">{formatPrice(m.priceCents)}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.shippingMethod && <p className="mt-2 text-sm text-[#d4006e]">{errors.shippingMethod}</p>}
                {!SHIPPING_RATES_CONFIRMED && <p className="mt-3 text-sm text-black/50">Tarifs de livraison en cours de validation avec le transporteur.</p>}
              </Step>
            </div>

            {/* Récapitulatif */}
            <aside aria-labelledby="summary-title" className="rounded-[28px] bg-ink p-5 text-paper sm:p-7 lg:sticky lg:top-28">
              <h2 id="summary-title" className="display text-3xl">Récapitulatif</h2>
              <ul className="mt-5 space-y-3">
                {totals.lines.map((l) => (
                  <li key={lineKey(l)} className="flex items-center gap-3">
                    <span className="grid h-16 w-20 shrink-0 place-items-center rounded-xl" style={{ background: l.product.accent }}>
                      <ProductImage product={l.product} size="sm" className="h-full w-full object-contain p-1" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="display block truncate text-xl">{l.product.name}</span>
                      <span className="font-mono text-xs text-paper/60">
                        {l.qty} × {formatPrice(l.unitCents)}
                      </span>
                    </span>
                    <span className="font-mono text-sm">{formatPrice(l.totalCents)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-6 space-y-2 border-t border-white/15 pt-5 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-paper/70">Sous-total</dt>
                  <dd className="font-mono">{formatPrice(totals.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-paper/70">Livraison</dt>
                  <dd className="font-mono">{totals.shippingCents === null ? '—' : formatPrice(totals.shippingCents)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-white/15 pt-3">
                  <dt className="font-bold">Total TTC</dt>
                  <dd className="display text-4xl text-volt">{formatPrice(totals.totalCents)}</dd>
                </div>
              </dl>

              {serverError && (
                <p role="alert" className="mt-4 rounded-2xl bg-flash/20 p-3 text-sm text-paper">
                  {serverError}
                </p>
              )}

              <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting || payment === undefined} className="btn-volt mt-6 w-full">
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Redirection vers le paiement…
                  </>
                ) : demo ? (
                  'Vérifier ma commande (démo)'
                ) : (
                  <>
                    <Lock size={16} /> Payer {formatPrice(totals.totalCents)}
                  </>
                )}
              </motion.button>
              <p className="mt-3 text-center text-xs text-paper/55">
                {demo
                  ? 'Mode démonstration : aucun paiement ne sera effectué.'
                  : 'Tu seras redirigé vers la page de paiement sécurisée de Stripe. Tes données de carte ne transitent jamais par notre site.'}
              </p>
              <p className="mt-3 text-center text-xs text-paper/45">
                En passant commande, tu acceptes nos <Link to="/cgv" className="underline">CGV</Link>.
              </p>
            </aside>
          </form>
          <DemoNotice show={demo && demoChecked} />
        </div>
      </div>
    </PageShell>
  );
}

/** En mode démonstration, on confirme seulement que le formulaire est valide. */
function DemoNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="status" className="mt-6 rounded-[24px] bg-white p-5 text-[15px] ring-1 ring-black/5">
      Formulaire complet. En mode démonstration, le parcours s’arrête ici : <strong>aucune commande n’a été créée et rien n’a été débité.</strong>
    </p>
  );
}
