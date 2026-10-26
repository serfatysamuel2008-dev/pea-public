// Pages légales : structure prête, informations de l'entreprise à compléter (repérées en vert).
// Faire relire ces textes par un professionnel avant la mise en ligne.
import { Link } from 'react-router-dom';
import { BRAND, RETURN_DAYS, SHIPPING_COUNTRIES, SHIPPING_METHODS, SHIPPING_RATES_CONFIRMED } from '../data/shop.ts';
import { formatPrice } from '../lib/format.ts';
import { InfoPage, Todo } from './InfoPage.tsx';

export function Shipping() {
  return (
    <InfoPage title="Livraison et retours" eyebrow="Aide" description="Modes de livraison, tarifs et conditions de retour STUDIOS.">
      <h2>Livraison</h2>
      <p>Nous livrons en {SHIPPING_COUNTRIES.map((c) => c.label).join(', ')}.</p>
      <ul>
        {SHIPPING_METHODS.map((m) => (
          <li key={m.id}>
            <strong>{m.label}</strong> : {formatPrice(m.priceCents)}
            {m.delay ? ` — ${m.delay}` : ''}
          </li>
        ))}
      </ul>
      {!SHIPPING_RATES_CONFIRMED && <p>Ces tarifs sont en cours de validation avec notre transporteur. Le montant exact est toujours affiché avant le paiement.</p>}
      <p>
        Délais de préparation et de livraison : <Todo>délais confirmés par le transporteur</Todo>
      </p>
      <h2>Retours</h2>
      <p>
        Tu disposes de {RETURN_DAYS} jours à compter de la réception de ta commande pour exercer ton droit de rétractation, sans avoir à te justifier. Les lunettes doivent être retournées dans leur
        état d’origine.
      </p>
      <p>
        Pour faire un retour, écris-nous depuis la page <Link to="/contact">Contact</Link> en indiquant ton numéro de commande. Adresse de retour : <Todo>adresse de retour</Todo>. Frais de retour :{' '}
        <Todo>à la charge du client ou de STUDIOS</Todo>.
      </p>
      <p>Le remboursement est effectué au plus tard 14 jours après réception de ta demande, avec le même moyen de paiement que celui utilisé pour la commande.</p>
    </InfoPage>
  );
}

export function Mentions() {
  return (
    <InfoPage title="Mentions légales" eyebrow="Légal" description="Mentions légales du site STUDIOS.">
      <h2>Éditeur du site</h2>
      <p>
        {BRAND.name} — <Todo>raison sociale et forme juridique</Todo>
        <br />
        Siège social : <Todo>adresse</Todo>
        <br />
        SIRET : <Todo>numéro SIRET</Todo> — TVA intracommunautaire : <Todo>numéro de TVA</Todo>
        <br />
        Directeur de la publication : <Todo>nom</Todo>
        <br />
        Contact : <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>
      </p>
      <h2>Hébergement</h2>
      <p>
        <Todo>nom, adresse et téléphone de l’hébergeur</Todo>
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>Le nom {BRAND.name}, le logo, les visuels et les textes de ce site sont protégés. Toute reproduction sans autorisation est interdite.</p>
    </InfoPage>
  );
}

export function Privacy() {
  return (
    <InfoPage title="Confidentialité" eyebrow="Légal" description="Politique de confidentialité de STUDIOS : données collectées et droits.">
      <h2>Données collectées</h2>
      <p>
        Lors d’une commande, nous collectons ton nom, ton e-mail, ton adresse de livraison et, si tu le donnes, ton téléphone. Ces données servent uniquement à traiter et livrer ta commande et à
        te contacter à son sujet.
      </p>
      <h2>Paiement</h2>
      <p>Le paiement est géré par Stripe. Tes données de carte bancaire sont saisies sur la page de Stripe et ne sont jamais transmises ni conservées par {BRAND.name}.</p>
      <h2>Stockage sur ton appareil</h2>
      <p>
        Ton panier, tes favoris et le brouillon du formulaire de commande sont enregistrés dans le stockage local de ton navigateur, sur ton appareil uniquement. Ce site n’utilise pas de cookie
        publicitaire ni d’outil de mesure d’audience.
      </p>
      <h2>Durée de conservation et transporteurs</h2>
      <p>
        <Todo>durée de conservation des commandes, transporteurs destinataires des adresses</Todo>
      </p>
      <h2>Tes droits</h2>
      <p>
        Tu peux accéder à tes données, les rectifier ou demander leur suppression en écrivant à <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>. Tu peux aussi introduire une
        réclamation auprès de la CNIL.
      </p>
    </InfoPage>
  );
}

export function Terms() {
  return (
    <InfoPage title="Conditions générales de vente" eyebrow="Légal" description="Conditions générales de vente STUDIOS.">
      <p>
        <Todo>faire rédiger ou relire ces CGV par un professionnel</Todo>
      </p>
      <h2>1. Objet</h2>
      <p>Les présentes conditions régissent les ventes de lunettes de soleil et accessoires réalisées sur ce site par {BRAND.name}.</p>
      <h2>2. Prix</h2>
      <p>Les prix sont indiqués en euros, toutes taxes comprises. Les frais de livraison sont indiqués avant la validation de la commande.</p>
      <h2>3. Commande et paiement</h2>
      <p>La commande est définitive après confirmation du paiement par notre prestataire (Stripe). Un e-mail de confirmation est envoyé.</p>
      <h2>4. Livraison</h2>
      <p>
        Voir la page <Link to="/livraison-retours">Livraison et retours</Link>.
      </p>
      <h2>5. Droit de rétractation</h2>
      <p>Tu disposes de {RETURN_DAYS} jours à compter de la réception pour te rétracter, conformément au Code de la consommation.</p>
      <h2>6. Garanties</h2>
      <p>Les produits bénéficient de la garantie légale de conformité et de la garantie des vices cachés.</p>
      <h2>7. Médiation</h2>
      <p>
        Médiateur de la consommation : <Todo>coordonnées du médiateur</Todo>
      </p>
    </InfoPage>
  );
}
