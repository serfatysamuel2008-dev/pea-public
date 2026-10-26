import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ShoppingBag, Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SHIPPING_METHODS } from '../../data/shop.ts';
import { formatPrice } from '../../lib/format.ts';
import { lineKey } from '../../lib/pricing.ts';
import { useCart } from '../../store/cart.tsx';
import { Price } from '../ui/Price.tsx';
import { ProductImage } from '../ui/ProductImage.tsx';
import { QtyStepper } from '../ui/QtyStepper.tsx';

export function CartDrawer() {
  const { open, setOpen, lines, count, subtotalCents, setQty, remove } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const cheapestShipping = Math.min(...SHIPPING_METHODS.map((m) => m.priceCents));

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      // Garde le focus dans le panneau.
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="on-light absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-paper text-ink outline-none sm:inset-y-3 sm:right-3 sm:rounded-[28px]"
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
          >
            <header className="flex items-center justify-between px-6 pb-4 pt-[max(env(safe-area-inset-top),20px)]">
              <h2 id="cart-title" className="display text-4xl">
                Panier <span className="align-top font-mono text-sm tracking-normal">({count})</span>
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-black/5 transition hover:rotate-90 hover:bg-black/10" aria-label="Fermer le panier">
                <X size={20} />
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <motion.div initial={{ rotate: -10, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} className="grid h-20 w-20 place-items-center rounded-full bg-volt">
                  <ShoppingBag size={30} />
                </motion.div>
                <p className="display mt-6 text-4xl">Ton panier est vide.</p>
                <p className="mt-2 text-black/60">14 modèles, un seul prix. Trouve ta paire.</p>
                <button
                  type="button"
                  className="btn-ink mt-8"
                  onClick={() => {
                    setOpen(false);
                    navigate('/collection');
                  }}
                >
                  Voir la collection <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={lineKey(l)}
                        layout
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60, height: 0, marginTop: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                        className="flex gap-4 overflow-hidden rounded-3xl bg-[#f2f2ee] p-3"
                      >
                        <Link to={`/produit/${l.product.slug}`} onClick={() => setOpen(false)} className="grid h-24 w-28 shrink-0 place-items-center rounded-2xl" style={{ background: l.product.accent }}>
                          <ProductImage product={l.product} size="sm" className="h-full w-full object-contain p-1" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="display truncate text-2xl">{l.product.name}</p>
                              <p className="truncate text-xs text-black/55">
                                {l.product.frameLabel} · {l.product.lensLabel}
                              </p>
                            </div>
                            <button type="button" onClick={() => remove(lineKey(l))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-black/50 transition hover:bg-flash/15 hover:text-flash" aria-label={`Supprimer ${l.product.name} du panier`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <QtyStepper size="sm" value={l.qty} onChange={(n) => setQty(lineKey(l), n)} label={`Quantité de ${l.product.name}`} />
                            <Price cents={l.totalCents} className="font-mono text-sm font-bold" />
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <footer className="space-y-3 border-t border-black/10 px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-5">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt>Sous-total</dt>
                      <dd className="font-mono font-bold">
                        <Price cents={subtotalCents} />
                      </dd>
                    </div>
                    <div className="flex justify-between text-black/60">
                      <dt>Livraison</dt>
                      <dd>dès {formatPrice(cheapestShipping)}, choisie à l’étape suivante</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="btn-ink w-full"
                    onClick={() => {
                      setOpen(false);
                      navigate('/commande');
                    }}
                  >
                    Passer commande <ArrowRight size={16} />
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="w-full py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-black/60 hover:text-ink">
                    Continuer mes achats
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
