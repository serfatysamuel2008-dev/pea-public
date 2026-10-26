import { Link } from 'react-router-dom';
import { BRAND } from '../../data/shop.ts';
import { Wordmark } from '../ui/Wordmark.tsx';

const COLS = [
  {
    title: 'Boutique',
    links: [
      { to: '/collection', label: 'Toute la collection' },
      { to: '/collection?tri=new', label: 'Nouveautés' },
      { to: '/favoris', label: 'Favoris' },
    ],
  },
  {
    title: 'Aide',
    links: [
      { to: '/faq', label: 'FAQ' },
      { to: '/livraison-retours', label: 'Livraison et retours' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { to: '/mentions-legales', label: 'Mentions légales' },
      { to: '/confidentialite', label: 'Politique de confidentialité' },
      { to: '/cgv', label: 'Conditions générales de vente' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink pt-20 text-paper">
      <div className="container-x grid gap-12 md:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="display text-5xl sm:text-6xl">
            See things
            <br />
            <span className="text-volt">differently.</span>
          </p>
          <div className="mt-8 flex gap-3">
            <a href={BRAND.instagram} target="_blank" rel="noreferrer" className="btn-ghost min-h-[44px] px-5 text-[11px]">Instagram</a>
            <a href={BRAND.tiktok} target="_blank" rel="noreferrer" className="btn-ghost min-h-[44px] px-5 text-[11px]">TikTok</a>
          </div>
        </div>
        <nav aria-label="Pied de page" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLS.map((c) => (
            <div key={c.title}>
              <h2 className="eyebrow mb-4 text-paper/50">{c.title}</h2>
              <ul className="space-y-3">
                {c.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-[15px] text-paper/85 transition hover:text-volt">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="eyebrow mb-4 text-paper/50">Contact</h2>
            <a href={`mailto:${BRAND.contactEmail}`} className="break-all text-[15px] text-paper/85 hover:text-volt">
              {BRAND.contactEmail}
            </a>
          </div>
        </nav>
      </div>
      <div className="container-x mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/45">
        <span>© {new Date().getFullYear()} {BRAND.name}</span>
        <span>Tous les modèles · 29,90 €</span>
      </div>
      <div aria-hidden className="pointer-events-none select-none px-2 pb-2 text-center text-[24.5vw] leading-[0.78] text-paper">
        <Wordmark />
      </div>
    </footer>
  );
}
