'use client';
import { Alert } from '@/types';
import { SUPERMARKET_COLORS, formatPrice } from '@/lib/utils';

interface Props { alerts: Alert[]; }

export default function Alertas({ alerts }: Props) {
  if (alerts.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">🔔</div>
      <p>Sin alertas todavía. Se generan automáticamente al detectar cambios de precio.</p>
    </div>
  );

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{alerts.length} cambios de precio detectados.</p>
      <div className="space-y-2">
        {alerts.map(a => (
          <div key={a.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${a.type === 'increase' ? 'border-red-200' : 'border-green-200'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${a.type === 'increase' ? 'bg-red-50' : 'bg-green-50'}`}>
              {a.type === 'increase' ? '📈' : '📉'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 text-sm truncate">{a.productName}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{a.brand}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${SUPERMARKET_COLORS[a.supermarket] || 'bg-gray-100'}`}>{a.supermarket}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-gray-400 line-through">{formatPrice(a.oldPrice)}</span>
                <span className="text-sm font-bold text-gray-900">{formatPrice(a.newPrice)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.type === 'increase' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {a.type === 'increase' ? '+' : ''}{a.changePercent}%
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(a.createdAt).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
