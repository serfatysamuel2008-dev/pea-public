import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getProduct } from '../../data/products.ts';
import { ProductImage } from '../ui/ProductImage.tsx';

gsap.registerPlugin(ScrollTrigger);

const LINEUP = ['afterhours', 'chrome', 'neon', 'havana', 'volt', 'glasshouse'].map((s) => getProduct(s)!);
const BG = ['#080808', '#315BFF', '#FF3CAC', '#8B5CF6', '#080808', '#C6FF00'];
const FG = ['#FFFFFF', '#FFFFFF', '#080808', '#FFFFFF', '#C6FF00', '#080808'];

/**
 * Défilement horizontal épinglé (GSAP ScrollTrigger) : chaque paire entre en pivotant,
 * le fond change de couleur d'un modèle à l'autre. Sur mobile : carrousel tactile natif.
 */
export function Lineup() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const el = track.current!;
      const distance = () => el.scrollWidth - window.innerWidth;
      const tween = gsap.to(el, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (st) => {
            const i = Math.min(BG.length - 1, Math.round(st.progress * (BG.length - 1)));
            gsap.to(section.current, { backgroundColor: BG[i], color: FG[i], duration: 0.5, overwrite: 'auto' });
          },
        },
      });
      el.querySelectorAll<HTMLElement>('[data-spin]').forEach((img) => {
        gsap.fromTo(
          img,
          { rotateY: -55, rotateZ: -8, scale: 0.75 },
          {
            rotateY: 35,
            rotateZ: 6,
            scale: 1.05,
            ease: 'none',
            scrollTrigger: { trigger: img, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
          },
        );
      });
      el.querySelectorAll<HTMLElement>('[data-name]').forEach((name) => {
        gsap.fromTo(
          name,
          { xPercent: 25 },
          { xPercent: -25, ease: 'none', scrollTrigger: { trigger: name, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } },
        );
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={section} className="relative overflow-hidden bg-ink text-paper" aria-labelledby="lineup-title">
      <div className="container-x pointer-events-none absolute inset-x-0 top-24 z-10 flex items-baseline justify-between md:top-28">
        <h2 id="lineup-title" className="display text-[12vw] md:text-[5.5vw]">The lineup</h2>
        <p className="eyebrow hidden md:block">Glisse →</p>
      </div>
      <div
        ref={track}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-16 pt-44 md:h-[100svh] md:snap-none md:gap-0 md:overflow-visible md:p-0"
      >
        <div aria-hidden className="hidden w-[18vw] shrink-0 md:block" />
        {LINEUP.map((p, i) => (
          <article key={p.id} className="relative flex w-[84vw] shrink-0 snap-center flex-col justify-center rounded-[28px] bg-white/5 p-6 md:w-[62vw] md:rounded-none md:bg-transparent md:p-[4vw]">
            <span data-name aria-hidden className="display pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 whitespace-nowrap text-center text-[17vw] opacity-[0.12] md:block">
              {p.name}
            </span>
            <div className="relative my-4 [perspective:1200px] md:my-0">
              <div data-spin className="mx-auto w-full max-w-[880px] [transform-style:preserve-3d]">
                <ProductImage product={p} view="three-quarter" sizes="(min-width: 768px) 60vw, 84vw" className="w-full drop-shadow-[0_40px_50px_rgba(0,0,0,.45)]" />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <span className="eyebrow opacity-70">
                  {String(i + 1).padStart(2, '0')} / {String(LINEUP.length).padStart(2, '0')}
                </span>
                <h3 className="display mt-2 text-5xl md:text-[5vw]">{p.name}</h3>
                <p className="mt-1 max-w-xs text-[15px] opacity-80">{p.tagline}</p>
              </div>
              <Link to={`/produit/${p.slug}`} className="group flex shrink-0 items-center gap-3 rounded-full py-1 pl-1 pr-5 ring-1 ring-current transition hover:scale-105" aria-label={`Voir ${p.name}, 29,90 €`}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-paper text-ink transition group-hover:rotate-45">
                  <ArrowUpRight size={18} />
                </span>
                <span className="font-mono text-sm font-bold">29,90 €</span>
              </Link>
            </div>
          </article>
        ))}
        <div aria-hidden className="hidden w-[10vw] shrink-0 md:block" />
      </div>
    </section>
  );
}
