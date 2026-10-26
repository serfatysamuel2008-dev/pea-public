import { describe, expect, it } from 'vitest';
import { EMPTY_FORM, validateCustomer } from './checkout.ts';

const valid = {
  ...EMPTY_FORM,
  email: 'lea@example.com',
  firstName: 'Léa',
  lastName: 'Martin',
  address: '12 rue de la Paix',
  postalCode: '75002',
  city: 'Paris',
};

describe('formulaire de commande', () => {
  it('accepte un formulaire complet', () => {
    expect(validateCustomer(valid)).toEqual({});
  });
  it('signale les champs manquants', () => {
    const e = validateCustomer(EMPTY_FORM);
    expect(Object.keys(e).sort()).toEqual(['address', 'city', 'email', 'firstName', 'lastName', 'postalCode']);
  });
  it('vérifie e-mail, code postal selon le pays et téléphone', () => {
    expect(validateCustomer({ ...valid, email: 'lea@' }).email).toBeDefined();
    expect(validateCustomer({ ...valid, postalCode: '7500' }).postalCode).toBeDefined();
    expect(validateCustomer({ ...valid, country: 'BE', postalCode: '1000' })).toEqual({});
    expect(validateCustomer({ ...valid, country: 'US' }).country).toBeDefined();
    expect(validateCustomer({ ...valid, phone: 'abc' }).phone).toBeDefined();
    expect(validateCustomer({ ...valid, shippingMethod: 'drone' }).shippingMethod).toBeDefined();
  });
});
