'use client';
import { useMemo } from 'react';
import { Product } from '@/types';
import { TARGET_BRANDS, SUPERMARKETS, formatPrice } from '@/lib/utils';

interface Props { products: Product[]; }

export default function Cobertura({ products }: Props) {
  const stats = useMemo(() => {
    const superStats = SUPERMARKETS.map(s => {
      const ps = products.filter(p => p.supermarket === s);
      return {
        name: s,
        count: ps.length,
        brands: new Set(ps.map(p => p.brand)).size,
        avgPrice: ps.length ? Math.round(ps.reduce((a, p) => a + p.publishedPrice, 0) / ps.length) : 0,
      };
    });
    const brandCoverage = TARGET_BRANDS.map(brand => {
      const present = SUPERMARKETS.filter(s => products.some(p => p.brand === brand && p.supermarket === s));
      const missing = SUPERMARKETS.filter(s => !products.some(p => p.brand === brand && p.supermarket === s));
      return { brand, present, missing, pct: Math.round((present.length / SUPERMARKETS.length) * 100) };
    });
    return { superStats, brandCoverage };
  }, [products]);

  const superColors: Record<string, string> = {
    'Tienda Inglesa': 'bg-red-50 border-red-200',
    'Tata': 'bg-orange-50 border-orange-200',
    'Disco': 'bg-purple-50 border-purple-200',
    'El Dorado': 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className="space-y-8">
      {/* Stats por super */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Estadísticas por supermercado</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.superStats.map(s => (
            <div key={s.name} className={`rounded-xl border p-4 ${superColors[s.name] || 'bg-gray-50 border-gray-200'}`}>
              <div className="font-semibold text-gray-800 text-sm mb-3">{s.name}</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Productos</span><span className="font-bold">{s.count}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Marcas</span><span className="font-bold">{s.brands}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Precio prom.</span><span className="font-bold">{formatPrice(s.avgPrice)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cobertura por marca */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Cobertura por marca</h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Marca</th>
                {SUPERMARKETS.map(s => <th key={s} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center">{s}</th>)}
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center">Cobertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.brandCoverage.map(({ brand, present, pct }) => (
                <tr key={brand} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{brand}</td>
                  {SUPERMARKETS.map(s => (
                    <td key={s} className="px-4 py-2.5 text-center">
                      {present.includes(s) ? <span className="text-green-500">✓</span> : <span className="text-red-300">✗</span>}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct === 100 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {present.length}/{SUPERMARKETS.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
