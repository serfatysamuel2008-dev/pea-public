import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getOrderStatus, type OrderStatus } from '../lib/api.ts';
import { formatPrice } from '../lib/format.ts';
import { writeJSON } from '../lib/storage.ts';
import { useSeo } from '../lib/seo.ts';
import { useCart } from '../store/cart.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';

/**
 * Page de confirmation : n'affiche « commande confirmée » que si le serveur,
 * après interrogation de Stripe, confirme que la session de paiement est payée.
 */
export default function Confirmation() {
  useSeo({ title: 'Confirmation de commande', description: 'Confirmation de ta commande STUDIOS.', noindex: true });
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const { clear } = useCart();
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'done'; order: OrderStatus }>(
    sessionId ? { kind: 'loading' } : { kind: 'error', message: 'Aucune commande à afficher.' },
  );

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    getOrderStatus(sessionId)
      .then((order) => {
        if (!alive) return;
        setState({ kind: 'done', order });
        if (order.paid) {
          clear();
          writeJSON('studios.checkout.draft', {});
        }
      })
      .catch((e: Error) => alive && setState({ kind: 'error', message: e.message }));
    return () => {
      alive = false;
    };
  }, [sessionId, clear]);

  return (
    <PageShell tone="light">
      <div className="container-x grid min-h-[90svh] place-items-center pb-20 pt-32">
        <div className="w-full max-w-xl text-center">
          {state.kind === 'loading' && (
            <p className="flex items-center justify-center gap-3 font-mono text-sm uppercase tracking-[0.2em]" role="status">
              <Loader2 className="animate-spin" size={18} /> Vérification du paiement…
            </p>
          )}
          {state.kind === 'error' && (
            <>
              <XCircle className="mx-auto text-flash" size={48} />
              <h1 className="display mt-6 text-6xl">Rien à confirmer</h1>
              <p className="mt-4 text-black/60">{state.message}</p>
              <Link to="/" className="btn-ink mt-8">Retour à l’accueil</Link>
            </>
          )}
          {state.kind === 'done' && state.order.paid && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <CheckCircle2 className="mx-auto text-electric" size={56} />
              <h1 className="display mt-6 text-[16vw] sm:text-8xl">Merci !</h1>
              <p className="mt-4 text-lg">
                Ta commande <strong className="font-mono">{state.order.reference}</strong> est confirmée
                {state.order.totalCents !== null && <> pour un total de <strong>{formatPrice(state.order.totalCents)}</strong></>}.
              </p>
              {state.order.email && <p className="mt-2 text-black/60">Un récapitulatif est envoyé à {state.order.email}.</p>}
              <ul className="mt-6 space-y-1 font-mono text-sm">
                {state.order.items.map((it) => (
                  <li key={it.name}>
                    {it.qty} × {it.name}
                  </li>
                ))}
              </ul>
              <Link to="/collection" className="btn-ink mt-10">Continuer</Link>
            </motion.div>
          )}
          {state.kind === 'done' && !state.order.paid && (
            <>
              <XCircle className="mx-auto text-flash" size={48} />
              <h1 className="display mt-6 text-6xl">Paiement non confirmé</h1>
              <p className="mt-4 text-black/60">
                Le paiement n’a pas été validé (statut : {state.order.status}). Ton panier est conservé : tu peux réessayer.
              </p>
              <Link to="/commande" className="btn-ink mt-8">Revenir à la commande</Link>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
