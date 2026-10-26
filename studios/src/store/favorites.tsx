import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getProductById } from '../data/products.ts';
import { readJSON, writeJSON } from '../lib/storage.ts';

const KEY = 'studios.favorites.v1';

type FavCtx = { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => boolean };
const Ctx = createContext<FavCtx | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    const raw = readJSON<unknown>(KEY, []);
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && !!getProductById(id)) : [];
  });
  useEffect(() => writeJSON(KEY, ids), [ids]);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id: string) => {
      const added = !ids.includes(id);
      setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
      return added;
    },
    [ids],
  );
  const value = useMemo(() => ({ ids, has, toggle }), [ids, has, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFavorites hors de FavoritesProvider');
  return c;
}
