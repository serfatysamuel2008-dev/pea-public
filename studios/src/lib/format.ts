const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** 2990 → « 29,90 € » */
export function formatPrice(cents: number): string {
  return eur.format(cents / 100).replace(/ | /g, ' ');
}
