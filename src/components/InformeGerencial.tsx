'use client';
import { useMemo } from 'react';
import { Product } from '@/types';
import { TARGET_BRANDS, SUPERMARKETS, formatPrice, BIMBO_OWN_BRANDS, detectCategory } from '@/lib/utils';
import { SuperLogo } from '@/components/SuperLogo';

interface Props { products: Product[]; }

export default function InformeGerencial({ products }: Props) {
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const brands = new Set(products.map(p => p.brand));
    const onOffer = products.filter(p => p.offerPrice && p.discount);
    const avgPrice = totalProducts
      ? Math.round(products.reduce((a, p) => a + p.publishedPrice, 0) / totalProducts)
      : 0;

    // Per-supermarket stats
    const superStats = SUPERMARKETS.map(s => {
      const ps = products.filter(p => p.supermarket === s);
      const offerPs = ps.filter(p => p.offerPrice && p.discount);
      return {
        name: s,
        count: ps.length,
        brands: new Set(ps.map(p => p.brand)).size,
        avgPrice: ps.length ? Math.round(ps.reduce((a, p) => a + p.publishedPrice, 0) / ps.length) : 0,
        offerCount: offerPs.length,
        offerPct: ps.length ? Math.round((offerPs.length / ps.length) * 100) : 0,
      };
    });

    // Brand coverage
    const brandCoverage = TARGET_BRANDS.map(brand => {
      const superCount = SUPERMARKETS.filter(s => products.some(p => p.brand === brand && p.supermarket === s)).length;
      return { brand, superCount, total: SUPERMARKETS.length, pct: Math.round((superCount / SUPERMARKETS.length) * 100) };
    }).sort((a, b) => b.superCount - a.superCount);

    // Top 5 cheapest and most expensive
    const sorted = [...products].sort((a, b) => a.publishedPrice - b.publishedPrice);
    const top5Cheap = sorted.slice(0, 5);
    const top5Expensive = sorted.slice(-5).reverse();

    // Offers by super
    const offersBySuperArr = SUPERMARKETS.map(s => ({
      name: s,
      offers: products.filter(p => p.supermarket === s && p.offerPrice && p.discount)
        .sort((a, b) => (b.discount || 0) - (a.discount || 0)),
    })).filter(s => s.offers.length > 0);

    return { totalProducts, brands, onOffer, avgPrice, superStats, brandCoverage, top5Cheap, top5Expensive, offersBySuperArr };
  }, [products]);

  const superColors: Record<string, { bg: string; text: string; border: string }> = {
    'Tienda Inglesa': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'Tata':           { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'Disco':          { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'El Dorado':      { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        Sin datos. Presioná &quot;Actualizar precios&quot; para ejecutar el scraping.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumen ejecutivo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total productos</div>
            <div className="text-3xl font-black text-gray-900">{stats.totalProducts}</div>
            <div className="text-xs text-gray-400 mt-1">{SUPERMARKETS.length} cadenas</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Marcas presentes</div>
            <div className="text-3xl font-black text-gray-900">{stats.brands.size}</div>
            <div className="text-xs text-gray-400 mt-1">de {TARGET_BRANDS.length} objetivo</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">En oferta</div>
            <div className="text-3xl font-black text-orange-500">{stats.onOffer.length}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.totalProducts > 0 ? `${Math.round((stats.onOffer.length / stats.totalProducts) * 100)}% del catálogo` : '—'}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Precio promedio</div>
            <div className="text-3xl font-black text-gray-900">{formatPrice(stats.avgPrice)}</div>
            <div className="text-xs text-gray-400 mt-1">todos los supers</div>
          </div>
        </div>
      </div>

      {/* Presencia por supermercado */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Presencia por supermercado</h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Cadena</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">Productos</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">Marcas</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">Precio prom.</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">En oferta</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">% oferta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.superStats.map(s => {
                const c = superColors[s.name] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
                return (
                  <tr key={s.name} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <SuperLogo name={s.name} size={24} />
                        <span className="font-semibold text-gray-800 text-sm">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{s.count}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{s.brands}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatPrice(s.avgPrice)}</td>
                    <td className="px-4 py-3 text-right text-orange-600 font-semibold">{s.offerCount}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.offerPct > 20 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                        {s.offerPct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cobertura de marcas */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cobertura de marcas</h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Marca</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Cobertura</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">Supers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.brandCoverage.map(({ brand, superCount, total, pct }) => (
                <tr key={brand} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-800 text-sm">{brand}</td>
                  <td className="px-4 py-2.5 w-48">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct === 100 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {superCount}/{total}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 cheapest / most expensive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Top 5 productos más baratos</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {stats.top5Cheap.map((p, i) => (
              <div key={p.id} className={`px-4 py-3 flex items-center gap-3 ${i < stats.top5Cheap.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 line-clamp-1">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.brand} · {p.supermarket}</div>
                </div>
                <div className="text-sm font-black text-green-700 flex-shrink-0">{formatPrice(p.publishedPrice)}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Top 5 productos más caros</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {stats.top5Expensive.map((p, i) => (
              <div key={p.id} className={`px-4 py-3 flex items-center gap-3 ${i < stats.top5Expensive.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 line-clamp-1">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.brand} · {p.supermarket}</div>
                </div>
                <div className="text-sm font-black text-red-600 flex-shrink-0">{formatPrice(p.publishedPrice)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumen de ofertas por super */}
      {stats.offersBySuperArr.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumen de ofertas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {stats.offersBySuperArr.map(({ name, offers }) => {
              const c = superColors[name] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
              return (
                <div key={name} className={`rounded-xl border ${c.border} overflow-hidden`}>
                  <div className={`px-4 py-2.5 ${c.bg} border-b ${c.border} flex items-center gap-2`}>
                    <SuperLogo name={name} size={22} />
                    <span className={`font-bold text-sm ${c.text}`}>{name}</span>
                    <span className="ml-auto text-xs text-gray-500">{offers.length} ofertas</span>
                  </div>
                  <div className="bg-white divide-y divide-gray-50">
                    {offers.slice(0, 5).map(p => (
                      <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 line-clamp-1">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.brand}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-400 line-through">{formatPrice(p.regularPrice)}</div>
                          <div className="text-sm font-bold text-green-700">{formatPrice(p.offerPrice)}</div>
                        </div>
                        <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                          -{p.discount}%
                        </span>
                      </div>
                    ))}
                    {offers.length > 5 && (
                      <div className="px-4 py-2 text-xs text-gray-400 text-center">
                        +{offers.length - 5} más...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
