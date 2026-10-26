import { useEffect, useState } from 'react';
import { getPaymentConfig, type PaymentConfig } from './api.ts';

let cache: Promise<PaymentConfig | null> | null = null;

/** undefined = vérification en cours ; null = aucun serveur de paiement joignable. */
export function usePaymentConfig() {
  const [config, setConfig] = useState<PaymentConfig | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    cache ??= getPaymentConfig();
    cache.then((c) => alive && setConfig(c));
    return () => {
      alive = false;
    };
  }, []);
  return config;
}
