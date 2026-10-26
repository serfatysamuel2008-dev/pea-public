import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products.ts';
import { RETURN_DAYS, SHIPPING_COUNTRIES } from '../data/shop.ts';
import { usePaymentConfig } from '../lib/usePaymentConfig.ts';
import { InfoPage } from './InfoPage.tsx';

function Item({ q, children }: { q: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/10">
      <h2>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-6 py-6 text-left text-xl font-bold sm:text-2xl">
          {q}
          <Plus className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-6 text-lg leading-relaxed text-black/70">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  const payment = usePaymentConfig();
  return (
    <InfoPage title="Questions fréquentes" eyebrow="FAQ" description="Prix, livraison, retours, paiement : les réponses aux questions sur STUDIOS.">
      <Item q="Pourquoi toutes les paires coûtent 29,90 € ?">
        C’est notre signature : {PRODUCTS.length} coloris, un seul prix. Tu choisis ta paire pour son style, pas pour son étiquette.
      </Item>
      <Item q="Dans quels pays livrez-vous ?">
        Actuellement : {SHIPPING_COUNTRIES.map((c) => c.label).join(', ')}. Les modes et tarifs de livraison sont détaillés sur la page{' '}
        <Link to="/livraison-retours" className="underline">Livraison et retours</Link>.
      </Item>
      <Item q="Puis-je retourner ma paire ?">
        Oui. Tu disposes de {RETURN_DAYS} jours après réception pour exercer ton droit de rétractation. La marche à suivre est sur la page{' '}
        <Link to="/livraison-retours" className="underline">Livraison et retours</Link>.
      </Item>
      <Item q="Quels moyens de paiement acceptez-vous ?">
        {payment?.stripe
          ? 'La carte bancaire, via la page de paiement sécurisée de Stripe. Tes données de carte ne passent jamais par notre site.'
          : 'Le paiement en ligne par carte bancaire (via Stripe) sera ouvert très bientôt. Pour l’instant, la boutique est en mode démonstration.'}
      </Item>
      <Item q="Quelle est la protection solaire des verres ?">
        Nous publierons la catégorie de protection, les matériaux et les dimensions de chaque modèle dès qu’ils auront été vérifiés auprès de notre fabricant. Nous préférons ne rien afficher plutôt
        qu’une information non vérifiée.
      </Item>
      <Item q="Toutes les paires ont-elles la même forme ?">
        Oui : une monture ronde au pont en trou de serrure, déclinée en {PRODUCTS.length} coloris. Sur la <Link to="/collection" className="underline">collection</Link>, filtre par couleur de monture, teinte des verres ou finition. Chaque fiche montre la paire en studio, en situation et en gros plan.
      </Item>
      <Item q="Une autre question ?">
        Écris-nous depuis la page <Link to="/contact" className="underline">Contact</Link>.
      </Item>
    </InfoPage>
  );
}
