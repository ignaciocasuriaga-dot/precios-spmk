'use client';
import { useMemo, useState } from 'react';
import { Product } from '@/types';
import { TARGET_BRANDS, formatPrice } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { SuperLogo } from '@/components/SuperLogo';

interface Props { products: Product[]; }

const SUPERS = ['Tata', 'Disco', 'Tienda Inglesa', 'El Dorado'] as const;
const SUPER_COLORS: Record<string, string> = {
  'Tata': '#F97316', 'Disco': '#7C3AED', 'Tienda Inglesa': '#DC2626', 'El Dorado': '#D97706',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmtUYU(v: any) { return `$${Number(v).toLocaleString('es-UY')}`; }

export default function Comparativa({ products }: Props) {
  const [view, setView] = useState<'tabla' | 'graficos'>('tabla');

  const ownProducts = useMemo(
    () => products.filter(p => TARGET_BRANDS.includes(p.brand as typeof TARGET_BRANDS[number])),
    [products]
  );

  // Cross-super table: for each brand, cheapest price per super
  const crossSuperData = useMemo(() => {
    const brands = [...new Set(ownProducts.map(p => p.brand))].sort();
    return brands.map(brand => {
      const bySuper: Record<string, Product> = {};
      for (const p of ownProducts.filter(p => p.brand === brand)) {
        const existing = bySuper[p.supermarket];
        if (!existing || p.publishedPrice < existing.publishedPrice) bySuper[p.supermarket] = p;
      }
      const prices = SUPERS.map(s => bySuper[s]?.publishedPrice ?? null).filter(Boolean) as number[];
      const minPrice = prices.length ? Math.min(...prices) : null;
      return { brand, bySuper, minPrice };
    });
  }, [ownProducts]);

  // Bar chart data: avg price per brand
  const avgByBrand = useMemo(() => {
    const brands = [...new Set(ownProducts.map(p => p.brand))].sort();
    return brands.map(brand => {
      const prods = ownProducts.filter(p => p.brand === brand);
      const avg = prods.length ? Math.round(prods.reduce((s, p) => s + p.publishedPrice, 0) / prods.length) : 0;
      return { brand: brand.length > 10 ? brand.slice(0, 10) + '…' : brand, avg, fullBrand: brand };
    });
  }, [ownProducts]);

  // Bar chart data: product count per super
  const countBySuperBrand = useMemo(() => {
    return SUPERS.map(sup => {
      const row: Record<string, number | string> = { super: sup };
      for (const b of [...new Set(ownProducts.map(p => p.brand))]) {
        row[b] = ownProducts.filter(p => p.supermarket === sup && p.brand === b).length;
      }
      return row;
    });
  }, [ownProducts]);

  if (ownProducts.length === 0) {
    return <div className="text-center py-20 text-gray-400 text-sm">Sin datos. Presioná "Actualizar precios".</div>;
  }

  const brandList = [...new Set(ownProducts.map(p => p.brand))].sort();

  return (
    <div className="space-y-5">
      {/* View toggle */}
      <div className="flex gap-2">
        {(['tabla', 'graficos'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              view === v ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
            }`}>
            {v === 'tabla' ? '📊 Tabla comparativa' : '📈 Gráficos'}
          </button>
        ))}
      </div>

      {view === 'tabla' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">Precio más bajo por marca en cada supermercado</h3>
            <p className="text-xs text-gray-400 mt-0.5">Verde = más barato · — = no disponible</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Marca</th>
                  {SUPERS.map(sup => (
                    <th key={sup} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <SuperLogo name={sup} size={18} />
                        <span>{sup === 'Tienda Inglesa' ? 'T. Inglesa' : sup}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {crossSuperData.map(({ brand, bySuper, minPrice }) => (
                  <tr key={brand} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800 text-sm whitespace-nowrap">{brand}</td>
                    {SUPERS.map(sup => {
                      const p = bySuper[sup];
                      const isCheapest = p && p.publishedPrice === minPrice;
                      return (
                        <td key={sup} className="px-4 py-3 text-center">
                          {p ? (
                            <div className={`inline-flex flex-col items-center ${isCheapest ? 'text-green-700' : 'text-gray-700'}`}>
                              <span className={`text-sm font-bold ${isCheapest ? '' : ''}`}>
                                {formatPrice(p.publishedPrice)}
                                {isCheapest && <span className="ml-0.5 text-xs">✓</span>}
                              </span>
                              {p.regularPrice && (
                                <span className="text-xs text-orange-500 font-semibold">-{p.discount}%</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'graficos' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Precio promedio por marca */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Precio promedio por marca (UYU)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={avgByBrand} layout="vertical" margin={{ top: 4, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="brand" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v) => [fmtUYU(v), 'Precio promedio']} />
                  <Bar dataKey="avg" fill="#DC2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Productos por supermarket */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Presencia por supermercado (productos)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={countBySuperBrand} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="super" tick={{ fontSize: 10 }} tickFormatter={s => s === 'Tienda Inglesa' ? 'T.Inglesa' : s} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                  {brandList.slice(0, 6).map((b, i) => (
                    <Bar key={b} dataKey={b} stackId="a" fill={['#DC2626','#F97316','#D97706','#16A34A','#7C3AED','#0891B2'][i % 6]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Precio por super para cada marca - mini charts */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Precio más bajo por supermercado para cada marca</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {crossSuperData.map(({ brand, bySuper, minPrice }) => {
                const data = SUPERS.map(sup => ({ sup: sup === 'Tienda Inglesa' ? 'T.Inglesa' : sup, precio: bySuper[sup]?.publishedPrice ?? 0, color: SUPER_COLORS[sup] })).filter(d => d.precio > 0);
                if (data.length === 0) return null;
                return (
                  <div key={brand} className="border border-gray-100 rounded-lg p-3">
                    <div className="text-xs font-bold text-gray-600 mb-2">{brand}</div>
                    <ResponsiveContainer width="100%" height={80}>
                      <BarChart data={data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                        <XAxis dataKey="sup" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${v}`} />
                        <Tooltip formatter={(v) => [fmtUYU(v), brand]} />
                        <Bar dataKey="precio" radius={[3, 3, 0, 0]}>
                          {data.map((entry) => (
                            <Cell key={entry.sup} fill={entry.precio === minPrice ? '#16A34A' : entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
