import { CreditCard, Package, RotateCcw, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RETURN_DAYS } from '../../data/shop.ts';
import { usePaymentConfig } from '../../lib/usePaymentConfig.ts';

/** Engagements réels uniquement : chaque ligne renvoie vers la page qui la détaille. */
export function TrustStrip() {
  const payment = usePaymentConfig();
  const items = [
    { icon: Tag, title: 'Prix unique', body: '29,90 € la paire, quel que soit le modèle.', to: '/collection' },
    { icon: Package, title: 'Livraison', body: 'En point relais ou à domicile.', to: '/livraison-retours' },
    { icon: RotateCcw, title: `${RETURN_DAYS} jours pour changer d’avis`, body: 'Droit de rétractation sur chaque commande.', to: '/livraison-retours' },
    {
      icon: CreditCard,
      title: 'Paiement',
      body: payment?.stripe ? 'Carte bancaire, paiement sécurisé par Stripe.' : 'Paiement en ligne bientôt disponible.',
      to: '/faq',
    },
  ];
  return (
    <section className="on-light border-t border-black/10 bg-paper text-ink" aria-label="Nos engagements">
      <ul className="container-x grid grid-cols-1 gap-px py-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, body, to }) => (
          <li key={title}>
            <Link to={to} className="flex h-full items-start gap-4 rounded-3xl p-5 transition hover:bg-black/[0.04]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-volt">
                <Icon size={18} />
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="text-sm text-black/60">{body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
