import { useState } from 'react';
import { productImage, VIEW_LABELS, VIEW_RATIO, type Product, type View } from '../../data/products.ts';

type Props = {
  product: Product;
  view?: View;
  size?: 'sm' | 'lg';
  className?: string;
  priority?: boolean;
  sizes?: string;
};

/** Visuel produit avec chargement progressif et repli lisible si l'image manque. */
export function ProductImage({ product, view = 'studio', size, className = '', priority, sizes = '(min-width: 1024px) 33vw, 50vw' }: Props) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const alt = `Lunettes de soleil STUDIOS ${product.name} ${VIEW_LABELS[view]}, monture ${product.frameLabel.toLowerCase()}, verres ${product.lensLabel.toLowerCase()}`;
  if (state === 'error') {
    return (
      <div role="img" aria-label={alt} className={`flex items-center justify-center ${className}`}>
        <span className="display text-3xl opacity-30">{product.name}</span>
      </div>
    );
  }
  const responsive = !size && view !== 'detail';
  return (
    <img
      src={productImage(product, view, size ?? 'lg')}
      srcSet={responsive ? `${productImage(product, view, 'sm')} 640w, ${productImage(product, view, 'lg')} 1180w` : undefined}
      sizes={responsive ? sizes : undefined}
      width={1180}
      height={Math.round(1180 / VIEW_RATIO[view])}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => setState('ok')}
      onError={() => setState('error')}
      className={`transition-opacity duration-500 ${state === 'ok' ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}
