'use client';
import { useMemo } from 'react';
import { Product } from '@/types';
import { SUPERMARKET_COLORS, formatPrice } from '@/lib/utils';

interface Props { products: Product[]; }

export default function Comparador({ products }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const key = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.values()]
      .filter(g => g.length >= 2)
      .map(g => {
        const sorted = [...g].sort((a, b) => a.publishedPrice - b.publishedPrice);
        const min = sorted[0].publishedPrice;
        const max = sorted[sorted.length - 1].publishedPrice;
        const diff = max > 0 ? Math.round(((max - min) / min) * 100) : 0;
        return { name: sorted[0].name, brand: sorted[0].brand, products: sorted, diff };
      })
      .sort((a, b) => b.diff - a.diff);
  }, [products]);

  if (groups.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">🔄</div>
      <p>No hay productos en 2 o más supermercados para comparar todavía.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">
        {groups.length} productos encontrados en 2+ supermercados, ordenados por mayor diferencia de precio.
      </p>
      {groups.map(({ name, brand, products: ps, diff }) => (
        <div key={name} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-semibold text-gray-800 text-sm">{name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{brand}</div>
            </div>
            {diff > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                +{diff}% diferencia
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ps.map((p, i) => (
              <div key={p.id} className={`rounded-lg p-3 text-center border ${i === 0 ? 'bg-green-50 border-green-200' : i === ps.length - 1 && ps.length > 1 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xs mb-1.5 px-1.5 py-0.5 rounded-full inline-block font-medium border ${SUPERMARKET_COLORS[p.supermarket] || 'bg-gray-100'}`}>{p.supermarket}</div>
                <div className={`font-bold text-base ${i === 0 ? 'text-green-700' : i === ps.length - 1 && ps.length > 1 ? 'text-red-600' : 'text-gray-800'}`}>{formatPrice(p.publishedPrice)}</div>
                {i === 0 && <div className="text-xs text-green-600 mt-1">más barato</div>}
                {i === ps.length - 1 && ps.length > 1 && <div className="text-xs text-red-500 mt-1">más caro</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
