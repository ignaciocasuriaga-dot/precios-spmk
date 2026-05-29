'use client';
import { useState, useMemo } from 'react';
import { Product } from '@/types';
import { SUPERMARKET_COLORS, formatPrice } from '@/lib/utils';

interface Props { products: Product[]; }

export default function Comparativa({ products }: Props) {
  const [view, setView] = useState<'table' | 'chart'>('table');

  const groups = useMemo(() => {
    // Group by brand + approximate name match across supermarkets
    const map = new Map<string, Product[]>();
    for (const p of products) {
      // Normalize name: remove supermarket-specific suffixes, lowercase
      const key = `${p.brand}::${p.name.toLowerCase().replace(/\s+/g, ' ').trim()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    // Also group by brand + similar names across supers
    const brandGroups = new Map<string, Product[]>();
    for (const p of products) {
      const words = p.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const key = `${p.brand}::${words.slice(0, 3).join('-')}`;
      if (!brandGroups.has(key)) brandGroups.set(key, []);
      brandGroups.get(key)!.push(p);
    }
    const allGroups = new Map<string, Product[]>();
    for (const [k, ps] of map) { if (ps.length >= 2) allGroups.set(k, ps); }
    for (const [k, ps] of brandGroups) {
      if (ps.length >= 2 && !allGroups.has(k)) {
        // Check different supermarkets
        const supers = new Set(ps.map(p => p.supermarket));
        if (supers.size >= 2) allGroups.set(k, ps);
      }
    }
    return [...allGroups.values()]
      .map(g => {
        const sorted = [...g].sort((a, b) => a.publishedPrice - b.publishedPrice);
        const min = sorted[0].publishedPrice;
        const max = sorted[sorted.length - 1].publishedPrice;
        const diff = max > 0 && min > 0 ? Math.round(((max - min) / min) * 100) : 0;
        return { name: sorted[0].name, brand: sorted[0].brand, products: sorted, diff };
      })
      .filter(g => g.products.length >= 2)
      .sort((a, b) => b.diff - a.diff);
  }, [products]);

  if (groups.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-5xl mb-3">🔄</div>
      <p className="text-sm">No hay productos en 2 o más supermercados para comparar todavía.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <strong className="text-gray-800">{groups.length}</strong> productos equivalentes en 2+ supers, agrupados por marca
        </p>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('table')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${view === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tabla
          </button>
          <button
            onClick={() => setView('chart')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${view === 'chart' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Gráfico
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Producto</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Marca</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Supermercado</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">Precio</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map(({ name, brand, products: ps, diff }) => (
                ps.map((p, i) => (
                  <tr key={p.id} className={`hover:bg-gray-50/50 ${i === 0 ? '' : ''}`}>
                    <td className="px-4 py-2.5 max-w-48">
                      {i === 0 ? (
                        <a href={p.url} target="_blank" rel="noopener" className="text-xs font-medium text-gray-800 hover:text-blue-600 line-clamp-2" title={name}>{name}</a>
                      ) : (
                        <span className="text-xs text-gray-400 pl-2 border-l-2 border-gray-100 line-clamp-2">{p.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {i === 0 && <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{brand}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SUPERMARKET_COLORS[p.supermarket] || 'bg-gray-100 text-gray-700'}`}>{p.supermarket}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold text-sm ${i === 0 ? 'text-green-700' : i === ps.length - 1 && ps.length > 1 ? 'text-red-600' : 'text-gray-800'}`}>
                      {formatPrice(p.publishedPrice)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {i === 0 && diff > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          +{diff}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.slice(0, 20).map(({ name, brand, products: ps, diff }) => {
            const max = Math.max(...ps.map(p => p.publishedPrice));
            return (
              <div key={name + brand} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm line-clamp-1">{name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{brand}</div>
                  </div>
                  {diff > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 flex-shrink-0 ml-2">
                      +{diff}% diferencia
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {ps.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border w-28 text-center flex-shrink-0 ${SUPERMARKET_COLORS[p.supermarket] || 'bg-gray-100 text-gray-700'}`}>
                        {p.supermarket}
                      </span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${i === 0 ? 'bg-green-500' : i === ps.length - 1 && ps.length > 1 ? 'bg-red-400' : 'bg-blue-400'}`}
                          style={{ width: max > 0 ? `${(p.publishedPrice / max) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-16 text-right flex-shrink-0 ${i === 0 ? 'text-green-700' : i === ps.length - 1 && ps.length > 1 ? 'text-red-600' : 'text-gray-800'}`}>
                        {formatPrice(p.publishedPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
