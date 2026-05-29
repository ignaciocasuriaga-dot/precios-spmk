'use client';
import { useState, useMemo } from 'react';
import { Product } from '@/types';
import { detectCategory, BIMBO_OWN_BRANDS, BREAD_CATEGORIES, formatPrice, SUPERMARKET_COLORS } from '@/lib/utils';
import { SuperLogo } from '@/components/SuperLogo';

type Category = 'Pan de Molde' | 'Pan de Tortuga' | 'Pan de Viena';
const SUPERS = ['Tata', 'Disco', 'Tienda Inglesa', 'El Dorado'] as const;

interface Props { products: Product[]; }

export default function BimboAnalysis({ products }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>('Pan de Molde');

  const categoryProducts = useMemo(
    () => products.filter(p => detectCategory(p.name, p.brand) === activeCategory),
    [products, activeCategory]
  );

  const superAnalyses = useMemo(() => {
    return SUPERS.map(sup => {
      const superProds = categoryProducts.filter(p => p.supermarket === sup);
      const brandMap = new Map<string, Product>();
      for (const p of superProds) {
        const existing = brandMap.get(p.brand);
        if (!existing || p.publishedPrice < existing.publishedPrice) brandMap.set(p.brand, p);
      }
      const ranked = [...brandMap.entries()]
        .sort(([, a], [, b]) => a.publishedPrice - b.publishedPrice)
        .map(([brand, product], i) => ({ brand, product, rank: i + 1, isBimbo: BIMBO_OWN_BRANDS.has(brand) }));
      const bimboEntries = ranked.filter(r => r.isBimbo);
      const bestBimboRank = bimboEntries.length > 0 ? Math.min(...bimboEntries.map(r => r.rank)) : null;
      return { sup, ranked, totalBrands: ranked.length, bimboPresent: bimboEntries.length > 0, bestBimboRank };
    });
  }, [categoryProducts]);

  const summary = useMemo(() => {
    const bimboP = categoryProducts.filter(p => BIMBO_OWN_BRANDS.has(p.brand));
    const compP = categoryProducts.filter(p => !BIMBO_OWN_BRANDS.has(p.brand));
    const supersPresent = superAnalyses.filter(s => s.bimboPresent).length;
    const supersFirst = superAnalyses.filter(s => s.bestBimboRank === 1).length;
    const bimboAvg = bimboP.length ? Math.round(bimboP.reduce((s, p) => s + p.publishedPrice, 0) / bimboP.length) : null;
    const compAvg = compP.length ? Math.round(compP.reduce((s, p) => s + p.publishedPrice, 0) / compP.length) : null;
    const priceDiff = bimboAvg && compAvg ? Math.round(((bimboAvg - compAvg) / compAvg) * 100) : null;
    return {
      supersPresent, supersFirst, priceDiff,
      bimboOffers: bimboP.filter(p => p.offerPrice).length,
      compOffers: compP.filter(p => p.offerPrice).length,
    };
  }, [categoryProducts, superAnalyses]);

  const categoryCountMap = Object.fromEntries(
    (BREAD_CATEGORIES as unknown as Category[]).map(cat => [
      cat, products.filter(p => detectCategory(p.name, p.brand) === cat).length,
    ])
  );

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        Sin datos. Presioná "Actualizar precios".
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {(BREAD_CATEGORIES as unknown as Category[]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              activeCategory === cat
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
            }`}
          >
            {cat}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeCategory === cat ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {categoryCountMap[cat] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {categoryProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          Sin productos de <strong>{activeCategory}</strong>.
        </div>
      ) : (
        <>
          {/* Compact summary bar */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm items-center">
            <span className="text-gray-500">
              Presente en <strong className="text-blue-600">{summary.supersPresent}/4</strong> supers
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">
              Más barato en <strong className={summary.supersFirst > 0 ? 'text-green-600' : 'text-gray-400'}>{summary.supersFirst}/4</strong>
            </span>
            {summary.priceDiff !== null && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">
                  vs competencia:{' '}
                  <strong className={summary.priceDiff > 5 ? 'text-orange-600' : summary.priceDiff < -5 ? 'text-green-600' : 'text-gray-700'}>
                    {summary.priceDiff > 0 ? '+' : ''}{summary.priceDiff}%
                  </strong>
                </span>
              </>
            )}
            {(summary.bimboOffers + summary.compOffers) > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">
                  <strong className="text-orange-500">{summary.bimboOffers + summary.compOffers}</strong> ofertas
                  {' '}(Bimbo: {summary.bimboOffers} · comp: {summary.compOffers})
                </span>
              </>
            )}
          </div>

          {/* 2×2 supermarket panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {superAnalyses.map(({ sup, ranked, totalBrands, bimboPresent, bestBimboRank }) => (
              <div key={sup} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SuperLogo name={sup} size={28} />
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${SUPERMARKET_COLORS[sup] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {sup}
                    </span>
                  </div>
                  {!bimboPresent ? (
                    <span className="text-xs text-gray-400 italic">Bimbo ausente</span>
                  ) : (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      bestBimboRank === 1 ? 'bg-green-100 text-green-700'
                      : bestBimboRank! <= 3 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-50 text-red-500'
                    }`}>
                      Bimbo #{bestBimboRank} de {totalBrands}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-gray-50">
                  {ranked.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-gray-300">Sin productos</div>
                  ) : ranked.map(({ brand, product, rank, isBimbo }) => (
                    <div key={brand} className={`px-4 py-2.5 flex items-center gap-3 ${isBimbo ? 'bg-red-50/30' : ''}`}>
                      <span className={`w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 ${
                        rank === 1 ? 'bg-green-100 text-green-700'
                        : rank === ranked.length && ranked.length > 2 ? 'bg-red-50 text-red-400'
                        : 'bg-gray-100 text-gray-500'
                      }`}>{rank}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-semibold ${isBimbo ? 'text-red-700' : 'text-gray-700'}`}>{brand}</span>
                          {isBimbo && <span className="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded font-bold leading-none">B</span>}
                        </div>
                        <a href={product.url || '#'} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-gray-400 truncate block hover:text-blue-500" title={product.name}>
                          {product.name}
                        </a>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-bold ${isBimbo ? 'text-red-800' : 'text-gray-800'}`}>
                          {formatPrice(product.publishedPrice)}
                        </div>
                        {product.offerPrice && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded font-semibold">
                            -{product.discount}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
