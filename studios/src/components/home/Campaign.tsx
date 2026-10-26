import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Share2 } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { getProduct } from '../../data/products.ts';
import { BRAND } from '../../data/shop.ts';
import { useToast } from '../../store/toast.tsx';
import { ProductImage } from '../ui/ProductImage.tsx';

const MODEL = getProduct('afterhours')!;

/**
 * Silhouette graphique façon affiche (en attendant les photos de campagne).
 * Pour utiliser une vraie photo : remplacer <Silhouette /> par une <img>.
 */
function Silhouette() {
  return (
    <svg viewBox="0 0 600 800" className="h-full w-full overflow-hidden md:overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="rim" x1="0" x2="1">
          <stop offset="0.55" stopColor="#080808" />
          <stop offset="1" stopColor="#315BFF" />
        </linearGradient>
        <radialGradient id="skin" cx="0.65" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#1a1a1a" />
          <stop offset="1" stopColor="#080808" />
        </radialGradient>
      </defs>
      {/* Coupe afro */}
      <g fill="#080808">
        {[
          [300, 170, 150], [190, 210, 95], [410, 210, 95], [160, 300, 70], [440, 300, 70], [230, 140, 90], [370, 140, 90], [300, 120, 100],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      {/* Tête, oreilles, cou */}
      <ellipse cx="190" cy="350" rx="22" ry="38" fill="#080808" />
      <ellipse cx="410" cy="350" rx="22" ry="38" fill="url(#rim)" />
      <path d="M200 300 C200 200 400 200 400 300 L400 380 C400 470 350 510 300 510 C250 510 200 470 200 380 Z" fill="url(#skin)" />
      <path d="M255 480 L255 575 L345 575 L345 480 Z" fill="#080808" />
      {/* Veste à grand col */}
      <path d="M-40 1200 L-40 720 C20 620 120 590 210 560 L300 610 L390 560 C480 590 580 620 640 720 L640 1200 Z" fill="#080808" />
      <path d="M210 560 L300 610 L250 700 L170 590 Z M390 560 L300 610 L350 700 L430 590 Z" fill="#141414" />
      {/* Liseré lumineux côté droit */}
      <path d="M398 300 L400 380 C400 470 350 510 300 510" fill="none" stroke="#315BFF" strokeWidth="4" opacity="0.9" />
      <path d="M390 560 C480 590 580 620 600 700" fill="none" stroke="#315BFF" strokeWidth="4" opacity="0.7" />
    </svg>
  );
}

export function Campaign() {
  const ref = useRef<HTMLElement>(null);
  const { notify } = useToast();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const figureY = useTransform(scrollYProgress, [0, 1], ['14%', '0%']);
  const textX = useTransform(scrollYProgress, [0, 1], ['10%', '-25%']);
  const glassesScale = useTransform(scrollYProgress, [0.2, 0.5], [1.6, 1]);
  const glassesRotate = useTransform(scrollYProgress, [0.2, 0.5], [-14, 0]);

  const share = async () => {
    const data = { title: BRAND.name, text: 'NOT MADE TO BLEND IN — toutes les paires à 29,90 €', url: window.location.origin + import.meta.env.BASE_URL };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        notify({ title: 'Lien copié', body: 'Colle-le dans ta story.' });
      }
    } catch {
      /* partage annulé */
    }
  };

  return (
    <section ref={ref} className="relative overflow-hidden bg-flash text-ink" aria-labelledby="campaign-title">
      <motion.p aria-hidden style={{ x: textX }} className="display pointer-events-none absolute top-[8%] whitespace-nowrap text-[30vw] leading-none text-ink/[0.12] md:text-[22vw]">
        Not made to blend in — Not made to blend in
      </motion.p>
      <div className="container-x relative grid min-h-[100svh] items-end gap-6 pt-28 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div className="relative z-10 order-2 pb-16 md:order-1 md:pb-0">
          <p className="eyebrow mb-6">Campagne — {MODEL.name}</p>
          <h2 id="campaign-title" className="display text-[17vw] md:text-[8.5vw]">
            Not made
            <br />
            to blend <span className="text-paper">in.</span>
          </h2>
          <p className="mt-6 max-w-sm text-lg">Une monture qui parle avant toi. {MODEL.name}, noir total, 29,90 €.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/collection" className="btn-ink">
              Discover the collection <ArrowRight size={16} />
            </Link>
            <button type="button" onClick={share} className="btn min-h-[52px] bg-paper text-ink hover:bg-volt" aria-label="Partager STUDIOS">
              <Share2 size={16} /> Partager
            </button>
          </div>
        </div>
        <motion.div style={{ y: figureY }} className="relative order-1 mx-auto aspect-[3/4] w-full max-w-[560px] md:order-2 md:self-end">
          <Silhouette />
          <motion.div style={{ scale: glassesScale, rotate: glassesRotate }} className="absolute left-[24%] top-[27%] w-[52%]">
            <ProductImage product={MODEL} view="front" sizes="40vw" className="w-full drop-shadow-[0_10px_20px_rgba(0,0,0,.5)]" />
          </motion.div>
          <div aria-hidden className="absolute right-0 top-[8%] grid h-28 w-28 place-items-center rounded-full bg-volt md:h-36 md:w-36">
            <motion.svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}>
              <path id="circle" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" fill="none" />
              <text className="fill-ink font-mono text-[9.5px] font-bold uppercase tracking-[0.18em]">
                <textPath href="#circle">One price · your style · one price · your style ·</textPath>
              </text>
            </motion.svg>
            <span className="display text-xl md:text-2xl">29,90€</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
