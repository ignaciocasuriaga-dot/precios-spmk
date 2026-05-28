'use client';
import { useState, useMemo } from 'react';
import { Product } from '@/types';
import { detectCategory, BIMBO_OWN_BRANDS, BREAD_CATEGORIES, formatPrice, SUPERMARKET_COLORS } from '@/lib/utils';

type Category = 'Pan de Molde' | 'Pan de Tortuga' | 'Pan de Viena';
const SUPERS = ['Tata', 'Disco', 'Tienda Inglesa', 'El Dorado'] as const;

interface Props { products: Product[]; }

interface RankedBrand {
  brand: string;
  product: Product;
  rank: number;
  isBimbo: boolean;
}

function SuperTag({ name }: { name: string }) {
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${SUPERMARKET_COLORS[name] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
      {name}
    </span>
  );
}

export default function BimboAnalysis({ products }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>('Pan de Molde');

  const categoryProducts = useMemo(
    () => products.filter(p => detectCategory(p.name, p.brand) === activeCategory),
    [products, activeCategory]
  );

  // Per supermarket: cheapest product per brand, sorted by price
  const superAnalyses = useMemo(() => {
    return SUPERS.map(sup => {
      const superProds = categoryProducts.filter(p => p.supermarket === sup);

      const brandMap = new Map<string, Product>();
      for (const p of superProds) {
        const existing = brandMap.get(p.brand);
        if (!existing || p.publishedPrice < existing.publishedPrice) brandMap.set(p.brand, p);
      }

      const ranked: RankedBrand[] = [...brandMap.entries()]
        .sort(([, a], [, b]) => a.publishedPrice - b.publishedPrice)
        .map(([brand, product], i) => ({
          brand,
          product,
          rank: i + 1,
          isBimbo: BIMBO_OWN_BRANDS.has(brand),
        }));

      const bimboEntries = ranked.filter(r => r.isBimbo);
      const bestBimboRank = bimboEntries.length > 0 ? Math.min(...bimboEntries.map(r => r.rank)) : null;

      return { sup, ranked, bimboEntries, totalBrands: ranked.length, bimboPresent: bimboEntries.length > 0, bestBimboRank };
    });
  }, [categoryProducts]);

  const insights = useMemo(() => {
    const bimboProds = categoryProducts.filter(p => BIMBO_OWN_BRANDS.has(p.brand));
    const compProds = categoryProducts.filter(p => !BIMBO_OWN_BRANDS.has(p.brand));
    const supersPresent = superAnalyses.filter(s => s.bimboPresent).length;
    const supersFirst = superAnalyses.filter(s => s.bestBimboRank === 1).length;
    const bimboOffers = bimboProds.filter(p => p.offerPrice).length;
    const compOffers = compProds.filter(p => p.offerPrice).length;
    const bimboAvg = bimboProds.length
      ? Math.round(bimboProds.reduce((s, p) => s + p.publishedPrice, 0) / bimboProds.length)
      : null;
    const compAvg = compProds.length
      ? Math.round(compProds.reduce((s, p) => s + p.publishedPrice, 0) / compProds.length)
      : null;
    const priceDiff = bimboAvg && compAvg ? Math.round(((bimboAvg - compAvg) / compAvg) * 100) : null;
    return { supersPresent, supersFirst, bimboOffers, compOffers, bimboAvg, compAvg, priceDiff };
  }, [categoryProducts, superAnalyses]);

  const categoryCountMap = Object.fromEntries(
    (BREAD_CATEGORIES as unknown as Category[]).map(cat => [
      cat,
      products.filter(p => detectCategory(p.name, p.brand) === cat).length,
    ])
  );

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">📊</div>
        <p className="text-base font-semibold text-gray-600 mb-2">Sin datos para analizar</p>
        <p className="text-sm">Presioná "Actualizar precios" para obtener datos de los supermercados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {(BREAD_CATEGORIES as unknown as Category[]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              activeCategory === cat
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
            }`}
          >
            {cat}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeCategory === cat ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {categoryCountMap[cat] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {categoryProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🍞</div>
          <p className="text-sm">No se encontraron productos de <strong>{activeCategory}</strong> en los datos actuales.</p>
        </div>
      ) : (
        <>
          {/* Insight cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Presencia Bimbo</div>
              <div className="text-2xl font-black text-blue-700">{insights.supersPresent}/4</div>
              <div className="text-xs text-blue-500 mt-1">supermercados con productos</div>
            </div>

            <div className={`border rounded-xl p-4 ${insights.supersFirst > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
              <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Más barato</div>
              <div className={`text-2xl font-black ${insights.supersFirst > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                {insights.supersFirst}/4
              </div>
              <div className="text-xs text-green-500 mt-1">supers donde Bimbo es #1</div>
            </div>

            <div className={`border rounded-xl p-4 ${
              insights.priceDiff !== null && insights.priceDiff > 5 ? 'bg-orange-50 border-orange-200'
              : insights.priceDiff !== null && insights.priceDiff < -5 ? 'bg-green-50 border-green-200'
              : 'bg-white border-gray-200'
            }`}>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Precio vs Comp.</div>
              {insights.priceDiff !== null ? (
                <>
                  <div className={`text-2xl font-black ${insights.priceDiff > 5 ? 'text-orange-600' : insights.priceDiff < -5 ? 'text-green-600' : 'text-gray-700'}`}>
                    {insights.priceDiff > 0 ? '+' : ''}{insights.priceDiff}%
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    B: {formatPrice(insights.bimboAvg)} · C: {formatPrice(insights.compAvg)}
                  </div>
                </>
              ) : <div className="text-gray-400 text-sm">Sin comparativa</div>}
            </div>

            <div className={`border rounded-xl p-4 ${insights.bimboOffers > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
              <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Ofertas activas</div>
              <div className="text-2xl font-black text-orange-600">{insights.bimboOffers + insights.compOffers}</div>
              <div className="text-xs text-orange-500 mt-1">
                Bimbo: {insights.bimboOffers} · Comp: {insights.compOffers}
              </div>
            </div>
          </div>

          {/* Super a super: 4 panels in 2×2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {superAnalyses.map(({ sup, ranked, totalBrands, bimboPresent, bestBimboRank }) => (
              <div key={sup} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Panel header */}
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <SuperTag name={sup} />
                    <span className="text-xs text-gray-400">{totalBrands} {totalBrands === 1 ? 'marca' : 'marcas'}</span>
                  </div>
                  {!bimboPresent ? (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-semibold">Bimbo ausente</span>
                  ) : (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      bestBimboRank === 1 ? 'bg-green-100 text-green-700'
                      : bestBimboRank! <= 3 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-50 text-red-600'
                    }`}>
                      Bimbo #{bestBimboRank} de {totalBrands}
                    </span>
                  )}
                </div>

                {/* Ranked rows */}
                {ranked.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-300 text-sm">Sin productos en esta categoría</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {ranked.map(({ brand, product, rank, isBimbo }) => (
                      <div key={brand} className={`px-4 py-3 flex items-center gap-3 ${isBimbo ? 'bg-red-50/40' : ''}`}>
                        {/* Rank bubble */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                          rank === 1 ? 'bg-green-100 text-green-700'
                          : rank === 2 ? 'bg-blue-50 text-blue-500'
                          : rank === ranked.length && ranked.length > 2 ? 'bg-red-50 text-red-400'
                          : 'bg-gray-100 text-gray-500'
                        }`}>
                          {rank}
                        </div>

                        {/* Brand + product name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-sm font-bold ${isBimbo ? 'text-red-700' : 'text-gray-700'}`}>{brand}</span>
                            {isBimbo && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Bimbo</span>}
                          </div>
                          <a
                            href={product.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 truncate block hover:text-blue-500 max-w-full"
                            title={product.name}
                          >
                            {product.name}
                          </a>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          <div className={`font-black text-sm ${isBimbo ? 'text-red-800' : 'text-gray-800'}`}>
                            {formatPrice(product.publishedPrice)}
                          </div>
                          {product.offerPrice && (
                            <>
                              <div className="text-xs text-gray-400 line-through leading-none">{formatPrice(product.regularPrice)}</div>
                              <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded font-bold">-{product.discount}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* All products in category — detail table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">Todos los productos — {activeCategory}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{categoryProducts.length} productos encontrados</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Producto', 'Marca', 'Supermercado', 'Precio', 'Regular', 'Dto.'].map(h => (
                      <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider ${['Precio', 'Regular', 'Dto.'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...categoryProducts]
                    .sort((a, b) => a.supermarket.localeCompare(b.supermarket, 'es') || a.publishedPrice - b.publishedPrice)
                    .map(p => {
                      const isBimbo = BIMBO_OWN_BRANDS.has(p.brand);
                      return (
                        <tr key={p.id} className={`hover:bg-blue-50/20 transition-colors ${isBimbo ? 'bg-red-50/20' : ''}`}>
                          <td className="px-3 py-2.5 max-w-52">
                            <a href={p.url || '#'} target="_blank" rel="noopener" className="font-medium text-gray-800 hover:text-blue-600 text-xs line-clamp-1" title={p.name}>{p.name}</a>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isBimbo ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{p.brand}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${SUPERMARKET_COLORS[p.supermarket] || 'bg-gray-100 text-gray-700'}`}>{p.supermarket}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{formatPrice(p.publishedPrice)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-400 text-xs">{formatPrice(p.regularPrice)}</td>
                          <td className="px-3 py-2.5 text-right">
                            {p.discount ? <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-bold">-{p.discount}%</span> : <span className="text-gray-200">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
