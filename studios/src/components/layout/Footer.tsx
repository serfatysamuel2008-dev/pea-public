import { Link } from 'react-router-dom';
import { BRAND } from '../../data/shop.ts';
import { Wordmark } from '../ui/Wordmark.tsx';

const COLS = [
  { title: 'Boutique', links: [{ to: '/collection', label: 'Toute la collection' }, { to: '/favoris', label: 'Favoris' }] },
  { title: 'Aide', links: [{ to: '/faq', label: 'FAQ' }, { to: '/livraison-retours', label: 'Livraison et retours' }, { to: '/contact', label: 'Contact' }] },
  { title: 'Légal', links: [{ to: '/mentions-legales', label: 'Mentions légales' }, { to: '/confidentialite', label: 'Politique de confidentialité' }, { to: '/cgv', label: 'Conditions générales de vente' }] },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink pt-16 text-paper">
      <div className="container-x grid gap-12 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Wordmark className="text-sm" />
          <p className="mt-4 max-w-xs text-sm text-mist">Lunettes de soleil rondes en treize coloris. Un seul prix : 29,90 €.</p>
          <div className="mt-6 flex gap-5 text-sm">
            <a href={BRAND.instagram} target="_blank" rel="noreferrer" className="text-paper/80 hover:text-paper">Instagram</a>
            <a href={BRAND.tiktok} target="_blank" rel="noreferrer" className="text-paper/80 hover:text-paper">TikTok</a>
          </div>
        </div>
        <nav aria-label="Pied de page" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLS.map((c) => (
            <div key={c.title}>
              <h2 className="eyebrow mb-4 text-mist">{c.title}</h2>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-paper/80 transition hover:text-paper">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="eyebrow mb-4 text-mist">Contact</h2>
            <a href={`mailto:${BRAND.contactEmail}`} className="break-all text-sm text-paper/80 hover:text-paper">
              {BRAND.contactEmail}
            </a>
          </div>
        </nav>
      </div>
      <div className="container-x mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] py-6 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
        <span>© {new Date().getFullYear()} {BRAND.name}</span>
        <span>Round 01 · 29,90 €</span>
      </div>
    </footer>
  );
}
