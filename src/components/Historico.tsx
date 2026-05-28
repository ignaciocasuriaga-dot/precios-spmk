'use client';
import { useState, useMemo } from 'react';
import { PriceHistoryEntry } from '@/types';
import { TARGET_BRANDS, SUPERMARKETS, formatPrice } from '@/lib/utils';

interface Props { history: PriceHistoryEntry[]; }

export default function Historico({ history }: Props) {
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSuper, setFilterSuper] = useState('');

  const filtered = useMemo(() =>
    history.filter(h => (!filterBrand || h.brand === filterBrand) && (!filterSuper || h.supermarket === filterSuper)),
    [history, filterBrand, filterSuper]
  );

  if (history.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">📈</div>
      <p>Sin historial todavía. Se genera con cada actualización.</p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas las marcas</option>
          {TARGET_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterSuper} onChange={e => setFilterSuper(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los supers</option>
          {SUPERMARKETS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center">{filtered.length} registros</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Producto','Marca','Supermercado','Precio','Fecha'].map((h, i) => (
                <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.slice(0, 200).map((h, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-800 text-xs max-w-48 truncate">{h.name}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{h.brand}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{h.supermarket}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatPrice(h.price)}</td>
                <td className="px-3 py-2 text-right text-gray-400 text-xs whitespace-nowrap">
                  {new Date(h.date).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <div className="p-3 text-center text-xs text-gray-400 border-t">Mostrando los últimos 200 registros de {filtered.length} totales.</div>
        )}
      </div>
    </div>
  );
}
