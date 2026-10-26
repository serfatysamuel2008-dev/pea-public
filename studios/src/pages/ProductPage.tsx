import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FINISHES, getProduct, productImage, PRODUCTS, SHAPE_LABEL } from '../data/products.ts';
import { BRAND, CURRENCY, RETURN_DAYS, SHIPPING_METHODS, SHIPPING_RATES_CONFIRMED } from '../data/shop.ts';
import { similarProducts } from '../lib/catalog.ts';
import { formatPrice } from '../lib/format.ts';
import { useSeo } from '../lib/seo.ts';
import { useCart } from '../store/cart.tsx';
import { useToast } from '../store/toast.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { ProductCard } from '../components/product/ProductCard.tsx';
import { ProductMedia } from '../components/product/ProductMedia.tsx';
import { FavoriteButton } from '../components/ui/FavoriteButton.tsx';
import { Price } from '../components/ui/Price.tsx';
import { QtyStepper } from '../components/ui/QtyStepper.tsx';
import NotFound from './NotFound.tsx';

function Disclosure({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-white/10">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between py-5 text-left font-bold">
        {title}
        <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-6 text-[15px] leading-relaxed text-white/70">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductPage() {
  const { slug = '' } = useParams();
  const product = getProduct(slug);
  const { add, setOpen } = useCart();
  const { notify } = useToast();
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<string | undefined>(product?.variants[0]?.id);
  const [added, setAdded] = useState(false);
  const buyRef = useRef<HTMLButtonElement>(null);
  const [buyVisible, setBuyVisible] = useState(true);

  useEffect(() => {
    setQty(1);
    setVariant(product?.variants[0]?.id);
  }, [product]);

  // Barre d'achat collante sur mobile quand le bouton principal sort de l'écran.
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBuyVisible(e.isIntersecting || e.boundingClientRect.top > window.innerHeight));
    io.observe(el);
    return () => io.disconnect();
  }, [product]);

  const jsonLd = useMemo(
    () =>
      product && {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${BRAND.name} ${product.name}`,
        description: product.description,
        image: [productImage(product, 'studio'), productImage(product, 'detail')].map((p) => new URL(p, window.location.href).href),
        brand: { '@type': 'Brand', name: BRAND.name },
        color: product.frameLabel,
        offers: {
          '@type': 'Offer',
          price: (product.priceCents / 100).toFixed(2),
          priceCurrency: CURRENCY,
          url: window.location.href,
        },
      },
    [product],
  );

  useSeo({
    title: product ? `${product.name} — Lunettes de soleil rondes, ${product.frameLabel.toLowerCase()}` : 'Modèle introuvable',
    description: product ? `${product.name} : ${product.description} ${formatPrice(product.priceCents)}.` : 'Ce modèle n’existe pas ou plus.',
    image: product ? productImage(product, 'studio') : undefined,
    noindex: !product,
    jsonLd: jsonLd || undefined,
  });

  if (!product) return <NotFound />;

  const similar = similarProducts(PRODUCTS, product, 4);
  const addToCart = () => {
    add({ productId: product.id, variantId: variant, qty });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
    notify({
      title: 'Dans ton panier',
      body: `${qty} × ${product.name} — ${formatPrice(product.priceCents * qty)}`,
      image: productImage(product, 'studio', 'sm'),
      action: { label: 'Voir', onClick: () => setOpen(true) },
    });
  };

  const specs: [string, string][] = [
    ['Forme', SHAPE_LABEL],
    ['Monture', product.frameLabel],
    ['Verres', product.lensLabel],
    ['Finition', FINISHES[product.finish]],
  ];

  return (
    <PageShell >
      <div className="container-x pb-24 pt-28 sm:pt-32">
        <nav aria-label="Fil d’Ariane" className="mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
          <Link to="/collection" className="flex items-center gap-1 hover:text-paper">
            <ArrowLeft size={14} /> Collection
          </Link>
          <span>/</span>
          <span className="text-paper" aria-current="page">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <ProductMedia product={product} />
          </div>

          <div>
            <p className="eyebrow text-white/50">
              {String(product.drop).padStart(2, '0')} / {PRODUCTS.length} — {FINISHES[product.finish]} · Verres {product.lensLabel.toLowerCase()}
            </p>
            <motion.h1 key={product.id} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="display mt-3 text-5xl sm:text-6xl lg:text-7xl">
              {product.name}
            </motion.h1>
            <p className="mt-2 text-xl font-bold">{product.tagline}</p>
            <p className="mt-6 flex items-baseline gap-3">
              <Price cents={product.priceCents} className="text-3xl font-semibold tracking-tight" />
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-white/50">TTC · prix unique</span>
            </p>
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-white/70">{product.description}</p>

            {product.variants.length > 1 && (
              <fieldset className="mt-8">
                <legend className="eyebrow mb-3 text-white/50">Coloris</legend>
                <div className="flex gap-2">
                  {product.variants.map((v) => (
                    <button key={v.id} type="button" aria-pressed={variant === v.id} onClick={() => setVariant(v.id)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${variant === v.id ? 'bg-paper text-ink' : 'bg-white/5'}`}>
                      <span className="h-4 w-4 rounded-full" style={{ background: v.swatch }} />
                      {v.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-8">
              <p className="eyebrow mb-3 text-white/50">
                Coloris — <span className="text-paper">{product.frameLabel}</span>
              </p>
              <div className="flex flex-wrap gap-2" role="list" aria-label="Autres coloris de cette monture">
                {PRODUCTS.map((p) => (
                  <Link
                    key={p.id}
                    role="listitem"
                    to={`/produit/${p.slug}`}
                    aria-label={`${p.name}, ${p.frameLabel}`}
                    aria-current={p.id === product.id ? 'page' : undefined}
                    title={p.name}
                    className={`grid h-12 w-[68px] place-items-center rounded-xl bg-white/[0.04] transition hover:bg-white/10 ${p.id === product.id ? 'ring-1 ring-paper' : ''}`}
                  >
                    <img src={productImage(p, 'studio', 'sm')} alt="" className="w-full px-1" loading="lazy" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, Math.min(10, n)))} label="Quantité" />
              <button ref={buyRef} type="button" onClick={addToCart} className="btn-light min-w-[220px] flex-1">
                <AnimatePresence mode="wait" initial={false}>
                  {added ? (
                    <motion.span key="ok" className="flex items-center gap-2" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
                      <Check size={16} /> Ajouté
                    </motion.span>
                  ) : (
                    <motion.span key="add" className="flex items-center gap-2" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
                      <ShoppingBag size={16} /> Ajouter au panier — {formatPrice(product.priceCents * qty)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <FavoriteButton product={product} className="!h-[52px] !w-[52px] !bg-white/5" />
            </div>

            <div className="mt-10">
              <Disclosure title="Caractéristiques" defaultOpen>
                <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2">
                  {specs.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-white/50">{k}</dt>
                      <dd className="font-medium text-paper">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-sm text-white/50">
                  Dimensions, matériaux et catégorie de protection solaire : ces informations seront publiées ici dès qu’elles auront été vérifiées auprès de notre fabricant.
                </p>
              </Disclosure>
              <Disclosure title="Livraison">
                <ul className="space-y-1">
                  {SHIPPING_METHODS.map((m) => (
                    <li key={m.id}>
                      {m.label} : {formatPrice(m.priceCents)}
                      {m.delay && ` — ${m.delay}`}
                    </li>
                  ))}
                </ul>
                {!SHIPPING_RATES_CONFIRMED && <p className="mt-2 text-sm text-white/50">Tarifs indicatifs, confirmés à l’étape de commande.</p>}
                <Link to="/livraison-retours" className="mt-3 inline-block underline underline-offset-4">Tout savoir sur la livraison</Link>
              </Disclosure>
              <Disclosure title="Retours">
                Tu disposes de {RETURN_DAYS} jours après réception pour exercer ton droit de rétractation.{' '}
                <Link to="/livraison-retours" className="underline underline-offset-4">Conditions de retour</Link>
              </Disclosure>
            </div>
          </div>
        </div>

        <section className="mt-28" aria-labelledby="similar-title">
          <div className="mb-8 flex items-end justify-between">
            <h2 id="similar-title" className="display text-4xl sm:text-5xl">Dans le même esprit</h2>
            <Link to="/collection" className="hidden font-mono text-[11px] uppercase tracking-[0.2em] underline underline-offset-4 sm:block">Toute la collection</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {similar.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      </div>

      {/* Barre d'achat mobile */}
      <AnimatePresence>
        {!buyVisible && (
          <motion.div
            initial={{ y: '120%' }}
            animate={{ y: 0 }}
            exit={{ y: '120%' }}
            className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-full bg-smoke p-1.5 pl-5 text-paper shadow-2xl ring-1 ring-white/10 lg:hidden"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <span className="display min-w-0 flex-1 truncate text-xl">{product.name}</span>
            <button type="button" onClick={addToCart} className="btn-light min-h-[46px] px-5">
              Ajouter — {formatPrice(product.priceCents * qty)}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
