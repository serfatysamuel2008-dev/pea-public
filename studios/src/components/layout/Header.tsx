import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BRAND } from '../../data/shop.ts';
import { useCart } from '../../store/cart.tsx';
import { useFavorites } from '../../store/favorites.tsx';
import { Wordmark } from '../ui/Wordmark.tsx';

const NAV = [
  { to: '/collection', label: 'Collection' },
  { to: '/collection?tri=new', label: 'Nouveautés' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

function Badge({ n, tone }: { n: number; tone: string }) {
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.span
          key={n}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 18 }}
          className={`absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[10px] font-bold ${tone}`}
        >
          {n}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function Header() {
  const { count, setOpen } = useCart();
  const { ids } = useFavorites();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setMenu(false), [location]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    document.documentElement.style.overflow = menu ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  const icon = 'relative grid h-11 w-11 place-items-center rounded-full transition hover:bg-white/10';

  return (
    <>
      <a href="#contenu" className="sr-only z-[100] rounded-full bg-volt px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Aller au contenu
      </a>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(env(safe-area-inset-top),12px)] sm:px-5">
        <div
          className={`mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-2 rounded-full pl-5 pr-1.5 text-paper transition-all duration-500 ${
            scrolled || menu || location.pathname !== '/' ? 'bg-ink/75 shadow-[0_10px_40px_-10px_rgba(0,0,0,.6)] ring-1 ring-white/10 backdrop-blur-xl' : 'bg-transparent'
          }`}
        >
          <Link to="/" className="text-[26px] outline-offset-4" aria-label={`${BRAND.name}, accueil`}>
            <Wordmark />
          </Link>
          <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.label}
                to={n.to}
                className="rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/75 transition hover:bg-white/10 hover:text-paper"
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center">
            <Link to="/collection?focus=recherche" className={`${icon} hidden sm:grid`} aria-label="Rechercher un modèle">
              <Search size={19} />
            </Link>
            <Link to="/favoris" className={icon} aria-label={`Favoris (${ids.length})`}>
              <Heart size={19} />
              <Badge n={ids.length} tone="bg-flash text-ink" />
            </Link>
            <button type="button" onClick={() => setOpen(true)} className={icon} aria-label={`Ouvrir le panier (${count} article${count > 1 ? 's' : ''})`}>
              <ShoppingBag size={19} />
              <Badge n={count} tone="bg-volt text-ink" />
            </button>
            <button type="button" onClick={() => setMenu((m) => !m)} className={`${icon} md:hidden`} aria-expanded={menu} aria-controls="menu-mobile" aria-label={menu ? 'Fermer le menu' : 'Ouvrir le menu'}>
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div
            id="menu-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-40 flex flex-col justify-between bg-volt px-6 pb-[max(env(safe-area-inset-bottom),28px)] pt-28 text-ink md:hidden"
            initial={{ clipPath: 'circle(0% at calc(100% - 44px) 40px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 44px) 40px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 44px) 40px)' }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label="Menu mobile" className="flex flex-col">
              {[{ to: '/', label: 'Accueil' }, ...NAV, { to: '/favoris', label: 'Favoris' }].map((n, i) => (
                <motion.div key={n.label} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                  <Link to={n.to} className="display block border-b border-ink/15 py-2 text-[15vw] leading-[0.95] active:text-electric">
                    {n.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
              <a href={BRAND.instagram} target="_blank" rel="noreferrer">Instagram</a>
              <a href={BRAND.tiktok} target="_blank" rel="noreferrer">TikTok</a>
              <span>29,90 €</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
