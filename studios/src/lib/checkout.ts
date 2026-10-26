// Validation du formulaire de commande. Partagée par le site et le serveur de paiement.
import { SHIPPING_COUNTRIES, SHIPPING_METHODS } from '../data/shop.ts';

export type CustomerForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  address2: string;
  postalCode: string;
  city: string;
  country: string;
  shippingMethod: string;
};

export const EMPTY_FORM: CustomerForm = {
  email: '', firstName: '', lastName: '', phone: '', address: '', address2: '',
  postalCode: '', city: '', country: 'FR', shippingMethod: SHIPPING_METHODS[0]?.id ?? '',
};

export type FormErrors = Partial<Record<keyof CustomerForm, string>>;

const POSTAL: Record<string, RegExp> = {
  FR: /^\d{5}$/,
  BE: /^\d{4}$/,
  LU: /^(L-?)?\d{4}$/i,
  CH: /^\d{4}$/,
};

export function validateCustomer(f: CustomerForm): FormErrors {
  const e: FormErrors = {};
  const req = (k: keyof CustomerForm, msg: string) => {
    if (!String(f[k] ?? '').trim()) e[k] = msg;
  };
  req('email', 'Indique ton e-mail pour recevoir la confirmation.');
  if (!e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Cet e-mail ne semble pas valide.';
  req('firstName', 'Ton prénom est requis.');
  req('lastName', 'Ton nom est requis.');
  req('address', 'L’adresse de livraison est requise.');
  req('city', 'La ville est requise.');
  req('postalCode', 'Le code postal est requis.');
  if (!SHIPPING_COUNTRIES.some((c) => c.code === f.country)) e.country = 'Nous ne livrons pas encore ce pays.';
  else if (!e.postalCode && !POSTAL[f.country]?.test(f.postalCode.trim())) e.postalCode = 'Ce code postal ne correspond pas au pays choisi.';
  if (f.phone.trim() && !/^\+?[\d\s.-]{8,20}$/.test(f.phone.trim())) e.phone = 'Ce numéro ne semble pas valide.';
  if (!SHIPPING_METHODS.some((m) => m.id === f.shippingMethod)) e.shippingMethod = 'Choisis un mode de livraison.';
  return e;
}
