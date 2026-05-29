'use client';
import { useState, useMemo } from 'react';
import { Product } from '@/types';
import { TARGET_BRANDS, SUPERMARKET_COLORS, formatPrice } from '@/lib/utils';
import { SuperLogo } from '@/components/SuperLogo';

const SUPERS = ['Tata', 'Disco', 'Tienda Inglesa', 'El Dorado'] as const;

interface Props { products: Product[]; }

export default function BimboAnalysis({ products }: Props) {
  const [brandFilter, setBrandFilter] = useState<string>('');

  const ownProducts = useMemo(
    () => products.filter(p => TARGET_BRANDS.includes(p.brand as typeof TARGET_BRANDS[number])),
    [products]
  );

  const filtered = useMemo(
    () => brandFilter ? ownProducts.filter(p => p.brand === brandFilter) : ownProducts,
    [ownProducts, brandFilter]
  );

  // Group: for each brand, show cheapest price per super
  const brandSummary = useMemo(() => {
    const brands = brandFilter ? [brandFilter] : [...new Set(ownProducts.map(p => p.brand))].sort();
    return brands.map(brand => {
      const bySuper: Record<string, Product> = {};
      for (const p of ownProducts.filter(p => p.brand === brand)) {
        const existing = bySuper[p.supermarket];
        if (!existing || p.publishedPrice < existing.publishedPrice) bySuper[p.supermarket] = p;
      }
      const entries = SUPERS.map(sup => ({ sup, product: bySuper[sup] || null }));
      const prices = entries.filter(e => e.product).map(e => e.product!.publishedPrice);
      const minPrice = prices.length ? Math.min(...prices) : null;
      const cheapestSup = entries.find(e => e.product && e.product.publishedPrice === minPrice)?.sup || null;
      return { brand, entries, minPrice, cheapestSup, totalProducts: ownProducts.filter(p => p.brand === brand).length };
    });
  }, [ownProducts, brandFilter]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of ownProducts) counts[p.brand] = (counts[p.brand] || 0) + 1;
    return counts;
  }, [ownProducts]);

  if (ownProducts.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        Sin datos. Presioná "Actualizar precios" para buscar los productos.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm items-center">
        <span className="text-gray-500">
          <strong className="text-gray-900">{ownProducts.length}</strong> productos en <strong className="text-gray-900">{new Set(ownProducts.map(p => p.supermarket)).size}/4</strong> supers
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500">
          <strong className="text-orange-500">{ownProducts.filter(p => p.offerPrice).length}</strong> en oferta
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500">
          <strong className="text-blue-600">{new Set(ownProducts.map(p => p.brand)).size}</strong> marcas relevadas
        </span>
      </div>

      {/* Brand filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setBrandFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            brandFilter === '' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          Todas las marcas
        </button>
        {[...new Set(ownProducts.map(p => p.brand))].sort().map(b => (
          <button
            key={b}
            onClick={() => setBrandFilter(b === brandFilter ? '' : b)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              brandFilter === b ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
            }`}
          >
            {b}
            <span className={`ml-1 ${brandFilter === b ? 'text-red-200' : 'text-gray-400'}`}>
              {brandCounts[b] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Brand cards — cheapest price per super */}
      <div className="space-y-3">
        {brandSummary.map(({ brand, entries, cheapestSup, totalProducts }) => (
          <div key={brand} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Brand header */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">{brand}</span>
                <span className="text-xs text-gray-400 font-normal">{totalProducts} producto{totalProducts !== 1 ? 's' : ''}</span>
              </div>
              {cheapestSup && (
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  Más barato: {cheapestSup}
                </span>
              )}
            </div>

            {/* Prices per super */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
              {entries.map(({ sup, product }) => {
                const isCheapest = sup === cheapestSup && product !== null;
                return (
                  <div key={sup} className={`px-4 py-3 flex flex-col gap-1 ${isCheapest ? 'bg-green-50/40' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <SuperLogo name={sup} size={20} />
                      <span className={`text-xs font-semibold ${SUPERMARKET_COLORS[sup]?.includes('orange') ? 'text-orange-700' : SUPERMARKET_COLORS[sup]?.includes('purple') ? 'text-purple-700' : SUPERMARKET_COLORS[sup]?.includes('red') ? 'text-red-700' : 'text-yellow-700'}`}>
                        {sup === 'Tienda Inglesa' ? 'T. Inglesa' : sup}
                      </span>
                    </div>
                    {product ? (
                      <div>
                        <div className={`text-base font-bold ${isCheapest ? 'text-green-700' : 'text-gray-800'}`}>
                          {formatPrice(product.publishedPrice)}
                          {isCheapest && <span className="ml-1 text-xs">↓</span>}
                        </div>
                        {product.regularPrice && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 line-through">{formatPrice(product.regularPrice)}</span>
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1 rounded">-{product.discount}%</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Product detail list for selected brand */}
      {brandFilter && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Todos los productos — {brandFilter}
          </div>
          <div className="divide-y divide-gray-50">
            {filtered
              .sort((a, b) => a.publishedPrice - b.publishedPrice)
              .map(p => (
                <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <SuperLogo name={p.supermarket} size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={p.url || '#'} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-gray-700 hover:text-blue-600 font-medium block truncate">
                      {p.name}
                    </a>
                    <span className="text-xs text-gray-400">{p.supermarket}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-gray-800">{formatPrice(p.publishedPrice)}</div>
                    {p.regularPrice && (
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-gray-400 line-through">{formatPrice(p.regularPrice)}</span>
                        <span className="text-xs font-bold text-orange-600">-{p.discount}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
