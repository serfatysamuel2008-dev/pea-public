import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProduct, PRODUCTS } from '../../data/products.ts';
import { formatPrice } from '../../lib/format.ts';
import { useMediaQuery } from '../../lib/motion.ts';
import { GlassesFilm, webglAvailable, type HudFrame } from '../../three/Film.ts';
import { ProductImage } from '../ui/ProductImage.tsx';

gsap.registerPlugin(ScrollTrigger);

const HERO = getProduct('havana')!;
const COLORWAYS_FROM = 0.875;

type Chapter = {
  id: string;
  from: number;
  to: number;
  eyebrow: string;
  title: string;
  body: string;
  /** Partie analysée (affiche le cadre de visée). */
  part?: { index: number; points: string[] };
};

const CHAPTERS: Chapter[] = [
  { id: 'intro', from: 0, to: 0.09, eyebrow: 'STUDIOS — Round 01', title: 'Une forme.\nTreize coloris.', body: `Lunettes de soleil rondes à pont en trou de serrure. ${formatPrice(PRODUCTS[0].priceCents)}.` },
  { id: 'bridge', from: 0.15, to: 0.29, eyebrow: 'Le détail', title: 'Le pont en\ntrou de serrure.', body: 'Une arche nette au-dessus du nez. C’est elle qui dessine le regard.' },
  { id: 'apart', from: 0.32, to: 0.41, eyebrow: 'Démontage', title: 'Pièce\npar pièce.', body: 'Sept éléments, assemblés en une seule paire. Regardons-les un par un.' },
  { id: 'face', from: 0.44, to: 0.52, eyebrow: 'Analyse', title: 'La face', body: 'D’un seul tenant : deux cercles épais et le pont, fondus l’un dans l’autre.', part: { index: 1, points: ['Cerclage épais aux bords arrondis', 'Pont en trou de serrure', 'Plaquettes de nez intégrées'] } },
  { id: 'lenses', from: 0.54, to: 0.62, eyebrow: 'Analyse', title: 'Les verres', body: 'Deux verres ronds teintés, logés dans le cerclage.', part: { index: 2, points: ['Forme ronde', 'Teinte selon le coloris : gris, bleu, brun ou ambre'] } },
  { id: 'hinges', from: 0.64, to: 0.72, eyebrow: 'Analyse', title: 'Les charnières', body: 'Elles relient la face aux branches et permettent de replier la paire.', part: { index: 3, points: ['Charnons métalliques', 'Rivets apparents sur le côté'] } },
  { id: 'temples', from: 0.74, to: 0.82, eyebrow: 'Analyse', title: 'Les branches', body: 'Larges à l’avant, elles s’affinent puis se courbent derrière l’oreille.', part: { index: 4, points: ['Section rectangulaire arrondie', 'Courbure à l’arrière'] } },
  { id: 'colors', from: COLORWAYS_FROM, to: 1.01, eyebrow: 'Réassemblée', title: 'Treize coloris.\nUn seul prix.', body: 'Écaille, translucide, dégradé ou noir brillant. Toutes à 29,90 €.' },
];

function timecode(p: number) {
  const frames = Math.round(p * 90 * 24);
  const s = Math.floor(frames / 24);
  const f = frames % 24;
  return `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

/** Cadre de visée autour de la pièce analysée, relié au panneau de texte. */
function Hud({ hudRef, panelSide }: { hudRef: React.MutableRefObject<((h: HudFrame) => void) | null>; panelSide: 'left' | 'bottom' }) {
  const box = useRef<SVGGElement>(null);
  const line = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  useEffect(() => {
    hudRef.current = (h) => {
      const g = box.current;
      if (!g || !line.current || !dot.current) return;
      if (!h.rect || !h.anchor) {
        g.style.opacity = '0';
        line.current.style.opacity = '0';
        dot.current.style.opacity = '0';
        return;
      }
      const pad = 18;
      const { x, y, w, hh } = { x: h.rect.x - pad, y: h.rect.y - pad, w: h.rect.w + pad * 2, hh: h.rect.h + pad * 2 };
      const c = 22;
      g.querySelector('path')!.setAttribute(
        'd',
        `M${x},${y + c}V${y}H${x + c} M${x + w - c},${y}H${x + w}V${y + c} M${x + w},${y + hh - c}V${y + hh}H${x + w - c} M${x + c},${y + hh}H${x}V${y + hh - c}`,
      );
      g.style.opacity = '1';
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const end = panelSide === 'left' ? { x: Math.min(vw * 0.36, x - 24), y: vh * 0.5 } : { x: vw * 0.5, y: vh * 0.68 };
      const start = panelSide === 'left' ? { x, y: y + hh / 2 } : { x: x + w / 2, y: y + hh };
      line.current.setAttribute('d', `M${start.x},${start.y} L${end.x},${end.y}`);
      line.current.style.opacity = start.x > end.x + 10 || panelSide === 'bottom' ? '0.5' : '0';
      dot.current.setAttribute('cx', String(h.anchor.x));
      dot.current.setAttribute('cy', String(h.anchor.y));
      dot.current.style.opacity = '1';
    };
    return () => {
      hudRef.current = null;
    };
  }, [hudRef, panelSide]);
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
      <g ref={box} style={{ opacity: 0, transition: 'opacity .4s' }}>
        <path fill="none" stroke="rgba(236,235,231,.75)" strokeWidth="1.2" />
      </g>
      <path ref={line} fill="none" stroke="rgba(236,235,231,.5)" strokeWidth="1" strokeDasharray="3 4" style={{ opacity: 0, transition: 'opacity .4s' }} />
      <circle ref={dot} r="4" fill="#ECEBE7" style={{ opacity: 0, transition: 'opacity .4s' }}>
        <animate attributeName="r" values="3;6;3" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Le film de la page d'accueil : une paire suivie par la caméra du début à la fin du défilement,
 * démontée puis analysée pièce par pièce, et présentée dans ses treize coloris.
 */
export function FilmSection() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const film = useRef<GlassesFilm | null>(null);
  const hudRef = useRef<((h: HudFrame) => void) | null>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [chapter, setChapter] = useState(0);
  const [inChapter, setInChapter] = useState(true);
  const [colorway, setColorway] = useState(-1);
  const [ready, setReady] = useState(false);
  const [has3D, setHas3D] = useState(true);
  const mobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    if (!webglAvailable()) {
      setHas3D(false);
      return;
    }
    const el = canvas.current!;
    const f = new GlassesFilm(el, HERO.look);
    film.current = f;
    f.onHud = (h) => hudRef.current?.(h);
    const ro = new ResizeObserver(() => f.resize(el.clientWidth, el.clientHeight));
    ro.observe(el);
    f.resize(el.clientWidth, el.clientHeight);
    f.start();
    const t = window.setTimeout(() => setReady(true), 150);
    // Ne calcule pas d'images quand le film est hors de l'écran.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? f.start() : f.stop()));
    io.observe(section.current!);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      io.disconnect();
      f.dispose();
      film.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const p = self.progress;
        film.current?.setProgress(p);
        if (tcRef.current) tcRef.current.textContent = timecode(p);
        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
        let idx = CHAPTERS.findIndex((c) => p >= c.from && p < c.to);
        const inside = idx !== -1;
        if (!inside) idx = Math.max(0, CHAPTERS.reduce((last, ch, i) => (p >= ch.from ? i : last), 0));
        setChapter(idx);
        setInChapter(inside);
        const cw = p >= COLORWAYS_FROM ? Math.min(PRODUCTS.length - 1, Math.floor(((p - COLORWAYS_FROM) / (1 - COLORWAYS_FROM)) * PRODUCTS.length)) : -1;
        setColorway(cw);
      },
    });
    return () => st.kill();
  }, []);

  useEffect(() => {
    film.current?.setLook((colorway >= 0 ? PRODUCTS[colorway] : HERO).look);
  }, [colorway]);

  const c = CHAPTERS[chapter];
  const shown = colorway >= 0 ? PRODUCTS[colorway] : HERO;
  const scrollToChapter = (i: number) => {
    const el = section.current!;
    const top = el.offsetTop + (el.offsetHeight - window.innerHeight) * (CHAPTERS[i].from + 0.01);
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section ref={section} className="relative bg-ink" style={{ height: mobile ? '900svh' : '1100vh' }} aria-label="STUDIOS Round 01, présentation de la monture">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {has3D ? (
          <canvas ref={canvas} className={`absolute inset-0 h-full w-full transition-opacity duration-[1500ms] ${ready ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <ProductImage product={shown} priority className="w-[86vw] max-w-[820px]" />
          </div>
        )}
        {/* Vignettage de cinéma */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,.65)_100%)]" />
        {has3D && <Hud hudRef={hudRef} panelSide={mobile ? 'bottom' : 'left'} />}

        {/* Indications de tournage */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[84px] flex justify-between px-5 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45 sm:px-10">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d4473f]" /> Rec · Cam A
          </span>
          <span ref={tcRef}>00:00:00:00</span>
        </div>

        {/* Texte du chapitre */}
        <div className="absolute inset-0 flex items-end pb-[max(env(safe-area-inset-bottom),28px)] md:items-center md:pb-0">
          <div className="container-x">
            <AnimatePresence mode="wait">
              {inChapter && (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-md"
                >
                  <p className="eyebrow text-paper/50">
                    {c.part ? `${c.eyebrow} — ${String(c.part.index).padStart(2, '0')} / 04` : c.eyebrow}
                  </p>
                  <h2 className="display mt-3 whitespace-pre-line text-[44px] sm:text-6xl lg:text-7xl">{c.title}</h2>
                  <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-paper/65 sm:text-base">{c.body}</p>
                  {c.part && (
                    <ul className="mt-5 space-y-2 border-l border-white/15 pl-4 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/70">
                      {c.part.points.map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                  )}
                  {c.id === 'intro' && (
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <Link to="/collection" className="btn-light">
                        Voir la collection <ArrowRight size={16} />
                      </Link>
                      <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/45">
                        <ArrowDown size={14} className="animate-bounce" /> Défiler
                      </span>
                    </div>
                  )}
                  {c.id === 'colors' && (
                    <div className="mt-7">
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/45">
                        {String(PRODUCTS.indexOf(shown) + 1).padStart(2, '0')} / {PRODUCTS.length}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight">
                        {shown.name} <span className="text-base font-normal text-paper/55">— {shown.frameLabel}</span>
                      </p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link to={`/produit/${shown.slug}`} className="btn-light">
                          Voir {shown.name} <ArrowRight size={16} />
                        </Link>
                        <Link to="/collection" className="btn-outline">Tous les coloris</Link>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chapitres */}
        <nav aria-label="Chapitres" className="absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex">
          {CHAPTERS.map((ch, i) => (
            <button key={ch.id} type="button" onClick={() => scrollToChapter(i)} className="group flex items-center gap-3 py-1" aria-current={i === chapter ? 'step' : undefined}>
              <span className={`font-mono text-[10px] uppercase tracking-[0.18em] transition ${i === chapter ? 'text-paper' : 'text-paper/0 group-hover:text-paper/50'}`}>
                {ch.part ? ch.title : ch.eyebrow}
              </span>
              <span className={`block h-px transition-all ${i === chapter ? 'w-8 bg-paper' : 'w-4 bg-paper/30 group-hover:bg-paper/60'}`} />
            </button>
          ))}
        </nav>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white/10">
          <span ref={barRef} className="block h-full origin-left scale-x-0 bg-paper/70" />
        </div>
      </div>
    </section>
  );
}
