// Accès au stockage local protégé : navigation privée, quota plein ou stockage bloqué
// ne doivent jamais casser la boutique.
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : le panier reste en mémoire */
  }
}
