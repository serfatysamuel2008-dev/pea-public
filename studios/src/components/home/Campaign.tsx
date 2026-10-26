import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Share2 } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { getProduct } from '../../data/products.ts';
import { BRAND } from '../../data/shop.ts';
import { useToast } from '../../store/toast.tsx';
import { StudioShot } from '../ui/StudioShot.tsx';

const MODEL = getProduct('deep-blue')!;

/**
 * Affiche de campagne : la paire en très grand sous un projecteur dur, ombre portée nette.
 * Emplacement prévu pour une photo portée par un mannequin quand elle existera.
 */
export function Campaign() {
  const ref = useRef<HTMLElement>(null);
  const { notify } = useToast();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const textX = useTransform(scrollYProgress, [0, 1], ['10%', '-25%']);
  const rotate = useTransform(scrollYProgress, [0.1, 0.6], [-18, -6]);
  const scale = useTransform(scrollYProgress, [0.1, 0.6], [1.25, 1]);
  const spotX = useTransform(scrollYProgress, [0, 1], ['70%', '40%']);
  const spot = useTransform(spotX, (x) => `radial-gradient(45% 60% at ${x} 45%, rgba(255,255,255,.55), transparent 70%)`);
  const glint = useSpring(useTransform(scrollYProgress, [0.2, 0.7], [0, 100]), { stiffness: 80, damping: 20 });

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
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: spot }}
      />
      <motion.p aria-hidden style={{ x: textX }} className="display pointer-events-none absolute top-[8%] whitespace-nowrap text-[30vw] leading-none text-ink/[0.1] md:text-[22vw]">
        Not made to blend in — Not made to blend in
      </motion.p>
      <div className="container-x relative grid min-h-[100svh] items-center gap-6 py-28 md:grid-cols-[1fr_1.2fr]">
        <div className="relative z-10 order-2 md:order-1">
          <p className="eyebrow mb-6">Campagne — {MODEL.name}</p>
          <h2 id="campaign-title" className="display text-[17vw] md:text-[8.5vw]">
            Not made
            <br />
            to blend <span className="text-paper">in.</span>
          </h2>
          <p className="mt-6 max-w-sm text-lg">Monture noire, verres bleus. {MODEL.name} ne passe pas inaperçue. 29,90 €.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/collection" className="btn-ink">
              Discover the collection <ArrowRight size={16} />
            </Link>
            <button type="button" onClick={share} className="btn min-h-[52px] bg-paper text-ink hover:bg-volt" aria-label="Partager STUDIOS">
              <Share2 size={16} /> Partager
            </button>
          </div>
        </div>
        <div className="relative order-1 md:order-2">
          <motion.div style={{ rotate, scale }} className="relative mx-auto w-full max-w-[760px] [filter:drop-shadow(30px_50px_30px_rgba(80,0,40,.45))]">
            <Link to={`/produit/${MODEL.slug}`} aria-label={`Voir ${MODEL.name}`}>
              <StudioShot product={MODEL} glint={glint} reflection={false} shadow={false} />
            </Link>
          </motion.div>
          <div aria-hidden className="absolute -top-6 right-2 grid h-28 w-28 place-items-center rounded-full bg-volt md:-top-10 md:h-36 md:w-36">
            <motion.svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}>
              <path id="circle" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" fill="none" />
              <text className="fill-ink font-mono text-[9.5px] font-bold uppercase tracking-[0.18em]">
                <textPath href="#circle">One price · your style · one price · your style ·</textPath>
              </text>
            </motion.svg>
            <span className="display text-xl md:text-2xl">29,90€</span>
          </div>
        </div>
      </div>
    </section>
  );
}
