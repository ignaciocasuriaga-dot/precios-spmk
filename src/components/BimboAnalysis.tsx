'use client';
import { useState, useMemo } from 'react';
import { Product } from '@/types';
import { detectCategory, BIMBO_OWN_BRANDS, BREAD_CATEGORIES, formatPrice, SUPERMARKET_COLORS } from '@/lib/utils';

type Category = 'Pan de Molde' | 'Pan de Tortuga' | 'Pan de Viena';
const SUPERS = ['Tata', 'Disco', 'Tienda Inglesa', 'El Dorado'] as const;

interface Props { products: Product[]; }

function SuperBadge({ name }: { name: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${SUPERMARKET_COLORS[name] || 'bg-gray-100 text-gray-700'}`}>
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

  const brands = useMemo(() => {
    const all = [...new Set(categoryProducts.map(p => p.brand))];
    return all.sort((a, b) => {
      const ai = BIMBO_OWN_BRANDS.has(a) ? 0 : 1;
      const bi = BIMBO_OWN_BRANDS.has(b) ? 0 : 1;
      return ai - bi || a.localeCompare(b, 'es');
    });
  }, [categoryProducts]);

  // matrix[brand][super] = cheapest product
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, Product | null>> = {};
    for (const brand of brands) {
      m[brand] = {};
      for (const s of SUPERS) {
        const ps = categoryProducts.filter(p => p.brand === brand && p.supermarket === s);
        m[brand][s] = ps.sort((a, b) => a.publishedPrice - b.publishedPrice)[0] ?? null;
      }
    }
    return m;
  }, [brands, categoryProducts]);

  // cheapest price per column (supermarket)
  const cheapestPerSuper = useMemo(() => {
    const r: Record<string, number | null> = {};
    for (const s of SUPERS) {
      const prices = brands.map(b => matrix[b]?.[s]?.publishedPrice).filter((p): p is number => p !== undefined);
      r[s] = prices.length ? Math.min(...prices) : null;
    }
    return r;
  }, [brands, matrix]);

  // most expensive price per column
  const mostExpPerSuper = useMemo(() => {
    const r: Record<string, number | null> = {};
    for (const s of SUPERS) {
      const prices = brands.map(b => matrix[b]?.[s]?.publishedPrice).filter((p): p is number => p !== undefined);
      r[s] = prices.length > 1 ? Math.max(...prices) : null;
    }
    return r;
  }, [brands, matrix]);

  const insights = useMemo(() => {
    const bimboProd = categoryProducts.filter(p => BIMBO_OWN_BRANDS.has(p.brand));
    const compProd = categoryProducts.filter(p => !BIMBO_OWN_BRANDS.has(p.brand));
    const allSorted = [...categoryProducts].sort((a, b) => a.publishedPrice - b.publishedPrice);
    const cheapestOverall = allSorted[0] ?? null;
    const bimboOffers = bimboProd.filter(p => p.offerPrice).length;
    const compOffers = compProd.filter(p => p.offerPrice).length;

    // Count how many supermarket × category cells Bimbo wins (cheapest)
    let bimboWins = 0;
    let totalComparisons = 0;
    for (const s of SUPERS) {
      const cheapest = cheapestPerSuper[s];
      if (cheapest === null) continue;
      totalComparisons++;
      const bimboPrice = Math.min(...bimboProd.filter(p => p.supermarket === s).map(p => p.publishedPrice).filter(Boolean));
      if (isFinite(bimboPrice) && bimboPrice <= cheapest + 0.01) bimboWins++;
    }

    const bimboAvgPrice = bimboProd.length
      ? Math.round(bimboProd.reduce((s, p) => s + p.publishedPrice, 0) / bimboProd.length)
      : null;
    const compAvgPrice = compProd.length
      ? Math.round(compProd.reduce((s, p) => s + p.publishedPrice, 0) / compProd.length)
      : null;

    return { cheapestOverall, bimboOffers, compOffers, bimboWins, totalComparisons, bimboAvgPrice, compAvgPrice, bimboCount: bimboProd.length, compCount: compProd.length };
  }, [categoryProducts, cheapestPerSuper]);

  // All products in category with offer, sorted by discount
  const activeOffers = useMemo(
    () => [...categoryProducts].filter(p => p.offerPrice && p.discount).sort((a, b) => (b.discount || 0) - (a.discount || 0)),
    [categoryProducts]
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

  const priceDiff = insights.bimboAvgPrice && insights.compAvgPrice
    ? Math.round(((insights.bimboAvgPrice - insights.compAvgPrice) / insights.compAvgPrice) * 100)
    : null;

  const categoryCountMap = Object.fromEntries(
    (BREAD_CATEGORIES as unknown as Category[]).map(cat => [
      cat,
      products.filter(p => detectCategory(p.name, p.brand) === cat).length,
    ])
  );

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
            {/* Más barato overall */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Más barato</div>
              {insights.cheapestOverall ? (
                <>
                  <div className="text-2xl font-black text-green-700">{formatPrice(insights.cheapestOverall.publishedPrice)}</div>
                  <div className="text-xs text-green-600 mt-1 truncate font-medium">{insights.cheapestOverall.brand}</div>
                  <SuperBadge name={insights.cheapestOverall.supermarket} />
                </>
              ) : <div className="text-gray-400 text-sm">—</div>}
            </div>

            {/* Precio promedio Bimbo vs competencia */}
            <div className={`border rounded-xl p-4 ${priceDiff !== null && priceDiff > 5 ? 'bg-red-50 border-red-200' : priceDiff !== null && priceDiff < -5 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bimbo vs Comp.</div>
              {insights.bimboAvgPrice && insights.compAvgPrice ? (
                <>
                  <div className={`text-2xl font-black ${priceDiff! > 5 ? 'text-red-600' : priceDiff! < -5 ? 'text-green-600' : 'text-gray-800'}`}>
                    {priceDiff! > 0 ? '+' : ''}{priceDiff}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Bimbo prom: {formatPrice(insights.bimboAvgPrice)}
                  </div>
                  <div className="text-xs text-gray-400">Comp prom: {formatPrice(insights.compAvgPrice)}</div>
                </>
              ) : insights.bimboAvgPrice ? (
                <>
                  <div className="text-2xl font-black text-blue-600">{formatPrice(insights.bimboAvgPrice)}</div>
                  <div className="text-xs text-gray-400 mt-1">sin competencia en categoría</div>
                </>
              ) : <div className="text-gray-400 text-sm">Sin productos Bimbo</div>}
            </div>

            {/* Ofertas activas */}
            <div className={`border rounded-xl p-4 ${activeOffers.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
              <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Ofertas activas</div>
              <div className="text-2xl font-black text-orange-600">{activeOffers.length}</div>
              <div className="text-xs text-orange-600 mt-1">
                Bimbo: {insights.bimboOffers} · Comp: {insights.compOffers}
              </div>
            </div>

            {/* Posición Bimbo */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Posición Bimbo</div>
              {insights.totalComparisons > 0 ? (
                <>
                  <div className="text-2xl font-black text-blue-700">
                    {insights.bimboWins}/{insights.totalComparisons}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">supers donde es más barato</div>
                </>
              ) : (
                <div className="text-gray-400 text-sm">Sin datos</div>
              )}
            </div>
          </div>

          {/* Price matrix */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Precio mínimo por marca y supermercado</h3>
                <p className="text-xs text-gray-400 mt-0.5">Verde = más barato en la columna · Rojo = más caro · 🏷 = en oferta</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-600 inline-block"></span> Bimbo Group</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-400 inline-block"></span> Competencia</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-36">Marca</th>
                    {SUPERS.map(s => (
                      <th key={s} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-28">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {brands.map((brand, bi) => {
                    const isBimbo = BIMBO_OWN_BRANDS.has(brand);
                    const isLastBimbo = isBimbo && (bi === brands.length - 1 || !BIMBO_OWN_BRANDS.has(brands[bi + 1]));
                    return (
                      <tr
                        key={brand}
                        className={`${isBimbo ? 'bg-red-50/40' : 'bg-gray-50/30'} hover:bg-blue-50/20 transition-colors ${isLastBimbo ? 'border-b-2 border-gray-200' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBimbo ? 'bg-red-500' : 'bg-gray-400'}`} />
                            <span className={`font-semibold text-sm ${isBimbo ? 'text-red-800' : 'text-gray-700'}`}>{brand}</span>
                            {isBimbo && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">B</span>}
                          </div>
                        </td>
                        {SUPERS.map(s => {
                          const prod = matrix[brand]?.[s] ?? null;
                          if (!prod) return (
                            <td key={s} className="px-3 py-3 text-center text-gray-200 text-sm">—</td>
                          );
                          const isCheapest = cheapestPerSuper[s] !== null && prod.publishedPrice <= cheapestPerSuper[s]! + 0.01;
                          const isMostExp = mostExpPerSuper[s] !== null && prod.publishedPrice >= mostExpPerSuper[s]! - 0.01;
                          const isOnOffer = !!prod.offerPrice;
                          return (
                            <td key={s} className="px-3 py-3 text-center">
                              <a href={prod.url} target="_blank" rel="noopener noreferrer" className="block group">
                                <div className={`inline-flex flex-col items-center rounded-lg px-2.5 py-1.5 transition-all ${
                                  isCheapest
                                    ? 'bg-green-100 border border-green-300'
                                    : isMostExp
                                    ? 'bg-red-50 border border-red-200'
                                    : 'bg-white border border-gray-200'
                                } group-hover:shadow-sm`}>
                                  <div className={`font-bold text-sm ${isCheapest ? 'text-green-700' : isMostExp ? 'text-red-600' : 'text-gray-800'}`}>
                                    {formatPrice(prod.publishedPrice)}
                                  </div>
                                  {isOnOffer && (
                                    <div className="text-xs text-gray-400 line-through leading-none">{formatPrice(prod.regularPrice)}</div>
                                  )}
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {isCheapest && <span className="text-green-600 text-xs font-bold">✓ min</span>}
                                    {isMostExp && !isCheapest && <span className="text-red-500 text-xs">↑ max</span>}
                                    {isOnOffer && <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded font-bold">🏷 -{prod.discount}%</span>}
                                  </div>
                                </div>
                              </a>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Footer row: cheapest per column */}
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-200">
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase">Mejor precio</td>
                    {SUPERS.map(s => (
                      <td key={s} className="px-3 py-2.5 text-center">
                        {cheapestPerSuper[s] !== null
                          ? <span className="text-green-700 font-bold text-sm">{formatPrice(cheapestPerSuper[s])}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Active offers detail */}
          {activeOffers.length > 0 && (
            <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-orange-100 bg-orange-50">
                <h3 className="font-bold text-orange-700 text-sm">🏷 Ofertas activas en {activeCategory}</h3>
                <p className="text-xs text-orange-500 mt-0.5">Productos con precio de oferta registrado</p>
              </div>
              <div className="divide-y divide-gray-50">
                {activeOffers.map(p => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-gray-800 hover:text-blue-600 block truncate">{p.name}</a>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-semibold ${BIMBO_OWN_BRANDS.has(p.brand) ? 'text-red-600' : 'text-gray-500'}`}>{p.brand}</span>
                        <SuperBadge name={p.supermarket} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-400 line-through">{formatPrice(p.regularPrice)}</div>
                      <div className="font-bold text-green-700 text-base">{formatPrice(p.offerPrice)}</div>
                      <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded">-{p.discount}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All products in category */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">Todos los productos — {activeCategory}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{categoryProducts.length} productos encontrados</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Producto', 'Marca', 'Supermercado', 'Precio', 'Regular', 'Oferta', 'Dto.'].map(h => (
                      <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Producto' || h === 'Marca' || h === 'Supermercado' ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...categoryProducts].sort((a, b) => a.brand.localeCompare(b.brand, 'es') || a.publishedPrice - b.publishedPrice).map(p => {
                    const isBimbo = BIMBO_OWN_BRANDS.has(p.brand);
                    return (
                      <tr key={p.id} className={`hover:bg-blue-50/20 transition-colors ${isBimbo ? 'bg-red-50/20' : ''}`}>
                        <td className="px-3 py-2.5 max-w-52">
                          <a href={p.url} target="_blank" rel="noopener" className="font-medium text-gray-800 hover:text-blue-600 text-xs line-clamp-1" title={p.name}>{p.name}</a>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isBimbo ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{p.brand}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${SUPERMARKET_COLORS[p.supermarket] || 'bg-gray-100 text-gray-700'}`}>{p.supermarket}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{formatPrice(p.publishedPrice)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-400 text-xs">{formatPrice(p.regularPrice)}</td>
                        <td className="px-3 py-2.5 text-right text-green-600 font-medium text-xs">{formatPrice(p.offerPrice)}</td>
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
