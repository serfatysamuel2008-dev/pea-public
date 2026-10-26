import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Toast = { id: number; title: string; body?: string; image?: string; action?: { label: string; onClick: () => void } };
type ToastCtx = { notify: (t: Omit<Toast, 'id'>) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const notify = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq.current;
    setToasts((cur) => [...cur.slice(-2), { ...t, id }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, []);

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-paper p-3 pr-4 text-ink shadow-[0_20px_60px_-20px_rgba(0,0,0,.5)] ring-1 ring-black/5"
              role="status"
            >
              {t.image && <img src={t.image} alt="" className="h-14 w-16 shrink-0 rounded-xl bg-volt object-contain p-1" />}
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg uppercase leading-none tracking-wide">{t.title}</p>
                {t.body && <p className="mt-1 truncate text-sm text-black/60">{t.body}</p>}
              </div>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper hover:bg-electric focus-visible:outline-2"
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast hors de ToastProvider');
  return c;
}
