'use client';
import { useMemo } from 'react';
import { Product } from '@/types';
import { detectCategory, BIMBO_OWN_BRANDS, BREAD_CATEGORIES, formatPrice } from '@/lib/utils';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface Props { products: Product[]; }

const SUPER_COLORS: Record<string, string> = {
  'Tata': '#F97316',
  'Disco': '#7C3AED',
  'Tienda Inglesa': '#DC2626',
  'El Dorado': '#D97706',
};
const PIE_COLORS = ['#F97316', '#7C3AED', '#DC2626', '#D97706'];
const RADIAN = Math.PI / 180;

function PieLabel(props: Record<string, unknown>) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props as {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
  };
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmtUYU(v: any) { return `$${Number(v).toLocaleString('es-UY')}`; }

export default function Comparativa({ products }: Props) {
  const superCountData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) counts[p.supermarket] = (counts[p.supermarket] || 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [products]);

  const avgPriceData = useMemo(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    for (const p of products) {
      if (!sums[p.supermarket]) sums[p.supermarket] = { sum: 0, count: 0 };
      sums[p.supermarket].sum += p.publishedPrice;
      sums[p.supermarket].count += 1;
    }
    return Object.entries(sums)
      .map(([name, { sum, count }]) => ({ name, avg: Math.round(sum / count) }))
      .sort((a, b) => a.avg - b.avg);
  }, [products]);

  const categoryData = useMemo(() => {
    return BREAD_CATEGORIES.map(cat => {
      const catProds = products.filter(p => detectCategory(p.name, p.brand) === cat);
      const bimbo = catProds.filter(p => BIMBO_OWN_BRANDS.has(p.brand));
      const comp = catProds.filter(p => !BIMBO_OWN_BRANDS.has(p.brand));
      const bimboAvg = bimbo.length ? Math.round(bimbo.reduce((s, p) => s + p.publishedPrice, 0) / bimbo.length) : 0;
      const compAvg = comp.length ? Math.round(comp.reduce((s, p) => s + p.publishedPrice, 0) / comp.length) : 0;
      return { category: cat.replace('Pan de ', ''), Bimbo: bimboAvg, Competencia: compAvg };
    });
  }, [products]);

  const offerData = useMemo(() => {
    const by: Record<string, { total: number; offers: number }> = {};
    for (const p of products) {
      if (!by[p.supermarket]) by[p.supermarket] = { total: 0, offers: 0 };
      by[p.supermarket].total += 1;
      if (p.offerPrice) by[p.supermarket].offers += 1;
    }
    return Object.entries(by).map(([name, { total, offers }]) => ({
      name, pct: Math.round((offers / total) * 100), offers, total,
    }));
  }, [products]);

  const priceRangeData = useMemo(() => {
    const by: Record<string, number[]> = {};
    for (const p of products) {
      if (!by[p.supermarket]) by[p.supermarket] = [];
      by[p.supermarket].push(p.publishedPrice);
    }
    return Object.entries(by).map(([name, prices]) => ({
      name,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    }));
  }, [products]);

  if (products.length === 0) {
    return <div className="text-center py-20 text-gray-400 text-sm">Sin datos. Presioná "Actualizar precios".</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Pie: distribución por supermercado */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Distribución de productos por supermercado</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={superCountData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={85} labelLine={false}
                label={(props) => <PieLabel {...props} />}>
                {superCountData.map((entry, i) => (
                  <Cell key={entry.name} fill={SUPER_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} productos`]} />
              <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: precio promedio por supermercado */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Precio promedio por supermercado (UYU)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={avgPriceData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v) => [fmtUYU(v), 'Precio promedio']} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {avgPriceData.map((entry) => (
                  <Cell key={entry.name} fill={SUPER_COLORS[entry.name] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: Bimbo vs Competencia por categoría */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Precio promedio — Bimbo vs Competencia por categoría</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v) => [fmtUYU(v)]} />
              <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
              <Bar dataKey="Bimbo" fill="#DC2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Competencia" fill="#6b7280" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: % en oferta por supermercado */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Productos en oferta por supermercado (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={offerData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip
                formatter={(v, _n, props) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const pl = (props as any).payload;
                  return [`${v}% (${pl?.offers ?? 0}/${pl?.total ?? 0} productos)`, 'En oferta'];
                }}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {offerData.map((entry) => (
                  <Cell key={entry.name} fill={SUPER_COLORS[entry.name] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla rango de precios */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Rango de precios por supermercado</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Supermercado', 'Mínimo', 'Promedio', 'Máximo', 'Amplitud'].map((h, i) => (
                  <th key={h} className={`py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {priceRangeData.map(row => {
                const color = SUPER_COLORS[row.name] || '#6b7280';
                return (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3">
                      <span style={{ background: color + '20', color, border: `1px solid ${color}40` }}
                        className="text-xs font-bold px-2.5 py-1 rounded-full">
                        {row.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-green-600 font-semibold">{formatPrice(row.min)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700 font-semibold">{formatPrice(row.avg)}</td>
                    <td className="py-2.5 px-3 text-right text-red-500 font-semibold">{formatPrice(row.max)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-400">{formatPrice(row.max - row.min)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
