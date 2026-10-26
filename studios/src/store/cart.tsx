import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { cartTotals, clampQty, lineKey, sanitizeCart, type CartLine } from '../lib/pricing.ts';
import { readJSON, writeJSON } from '../lib/storage.ts';

const KEY = 'studios.cart.v1';

type Action =
  | { type: 'add'; line: CartLine }
  | { type: 'setQty'; key: string; qty: number }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'replace'; lines: CartLine[] };

export function cartReducer(state: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.line);
      const existing = state.find((l) => lineKey(l) === key);
      if (existing) return state.map((l) => (l === existing ? { ...l, qty: clampQty(l.qty + action.line.qty) } : l));
      return sanitizeCart([...state, { ...action.line, qty: clampQty(action.line.qty) }]);
    }
    case 'setQty':
      return state.map((l) => (lineKey(l) === action.key ? { ...l, qty: clampQty(action.qty) } : l));
    case 'remove':
      return state.filter((l) => lineKey(l) !== action.key);
    case 'clear':
      return [];
    case 'replace':
      return sanitizeCart(action.lines);
  }
}

type CartCtx = ReturnType<typeof cartTotals> & {
  items: CartLine[];
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, () => sanitizeCart(readJSON(KEY, [])));
  const [open, setOpen] = useState(false);

  useEffect(() => writeJSON(KEY, items), [items]);

  // Synchronise les onglets ouverts en même temps.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) dispatch({ type: 'replace', lines: readJSON(KEY, []) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((line: CartLine) => dispatch({ type: 'add', line }), []);
  const setQty = useCallback((key: string, qty: number) => dispatch({ type: 'setQty', key, qty }), []);
  const remove = useCallback((key: string) => dispatch({ type: 'remove', key }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo(
    () => ({ ...cartTotals(items), items, open, setOpen, add, setQty, remove, clear }),
    [items, open, add, setQty, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart hors de CartProvider');
  return c;
}
