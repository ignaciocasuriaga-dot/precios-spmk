'use client';
import { useMemo } from 'react';
import { Product } from '@/types';
import { SUPERMARKET_COLORS, formatPrice } from '@/lib/utils';

interface Props { products: Product[]; }

export default function Ofertas({ products }: Props) {
  const offers = useMemo(() =>
    products.filter(p => p.offerPrice && p.discount).sort((a, b) => (b.discount || 0) - (a.discount || 0)),
    [products]
  );

  if (offers.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">🏷️</div>
      <p>No hay ofertas activas en este momento.</p>
    </div>
  );

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{offers.length} productos con descuento activo, ordenados por mayor ahorro.</p>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Producto','Marca','Supermercado','Precio Lista','Precio Oferta','Ahorro','%'].map(h => (
                <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Producto' || h === 'Marca' || h === 'Supermercado' ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {offers.map(p => (
              <tr key={p.id} className="hover:bg-green-50/20">
                <td className="px-3 py-2.5 font-medium text-gray-800 max-w-48">
                  <a href={p.url} target="_blank" rel="noopener" className="hover:text-blue-600 line-clamp-1 text-xs">{p.name}</a>
                </td>
                <td className="px-3 py-2.5">
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{p.brand}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SUPERMARKET_COLORS[p.supermarket] || 'bg-gray-100'}`}>{p.supermarket}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-gray-400 line-through text-xs">{formatPrice(p.regularPrice)}</td>
                <td className="px-3 py-2.5 text-right text-green-700 font-semibold">{formatPrice(p.offerPrice)}</td>
                <td className="px-3 py-2.5 text-right text-green-600 text-xs font-medium">
                  {p.regularPrice && p.offerPrice ? formatPrice(p.regularPrice - p.offerPrice) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-bold">-{p.discount}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
