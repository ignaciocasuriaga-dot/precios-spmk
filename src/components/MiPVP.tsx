'use client';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product } from '@/types';
import { SuperLogo } from '@/components/SuperLogo';
import { formatPrice } from '@/lib/utils';

interface Props {
  products: Product[];
  onBatchUpdatePVP?: (updates: Array<{ id: string; pvp: number }>) => void;
}

interface MatchedRow {
  fileDesc: string;
  filePvp: number;
  matched: Product | null;
  gap: number | null;
}

interface SuperState {
  fileName: string;
  loadedAt: string;
  rows: MatchedRow[];
  saved: boolean;
}

const SUPERS = ['Tata', 'Disco', 'Tienda Inglesa', 'El Dorado'] as const;

const SUPER_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'Tata':          { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  'Disco':         { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200' },
  'Tienda Inglesa':{ bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
  'El Dorado':     { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
};

function matchRows(fileRows: Array<{ desc: string; pvp: number }>, superProducts: Product[]): MatchedRow[] {
  return fileRows.map(({ desc, pvp }) => {
    const needle = desc.toLowerCase().trim();
    let best: Product | null = null;
    let bestScore = 0;
    for (const p of superProducts) {
      const hay = p.name.toLowerCase();
      if (hay === needle) { best = p; break; }
      const words = needle.split(/\s+/).filter(w => w.length > 2);
      const score = words.filter(w => hay.includes(w)).length / Math.max(words.length, 1);
      if (score > bestScore && score >= 0.4) { best = p; bestScore = score; }
    }
    const gap = best ? Math.round(((best.publishedPrice - pvp) / pvp) * 100) : null;
    return { fileDesc: desc, filePvp: pvp, matched: best, gap };
  });
}

export default function MiPVP({ products, onBatchUpdatePVP }: Props) {
  const [states, setStates] = useState<Partial<Record<string, SuperState>>>({});
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFile(sup: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setErrors(prev => ({ ...prev, [sup]: undefined }));

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
      if (rows.length < 2) { setErrors(prev => ({ ...prev, [sup]: 'El archivo está vacío.' })); return; }

      const header = rows[0].map(c => String(c).toLowerCase().trim());
      const priceIdx = header.findIndex(h => h.includes('pvp') || h.includes('precio') || h.includes('price') || h.includes('$') || h.includes('importe'));
      const nameIdx  = header.findIndex(h => h.includes('descripcion') || h.includes('descripción') || h.includes('producto') || h.includes('nombre') || h.includes('name') || h.includes('ean') || h.includes('codigo'));

      if (priceIdx < 0) {
        setErrors(prev => ({ ...prev, [sup]: 'No se encontró columna de precio (PVP, Precio, $, Importe).' }));
        return;
      }

      const fileRows: Array<{ desc: string; pvp: number }> = [];
      for (const row of rows.slice(1)) {
        if (!row.some(c => c !== '')) continue;
        const rawPrice = String(row[priceIdx] ?? '').replace(/[^\d.,]/g, '').replace(',', '.');
        const pvp = parseFloat(rawPrice);
        if (!pvp || pvp <= 0) continue;
        const desc = nameIdx >= 0 ? String(row[nameIdx]).trim() : row.find(c => c && String(c).length > 3) || '';
        if (!desc) continue;
        fileRows.push({ desc: String(desc), pvp });
      }

      if (fileRows.length === 0) {
        setErrors(prev => ({ ...prev, [sup]: 'No se encontraron filas con datos válidos.' }));
        return;
      }

      const superProducts = products.filter(p => p.supermarket === sup);
      const matched = matchRows(fileRows, superProducts);
      setStates(prev => ({ ...prev, [sup]: { fileName: file.name, loadedAt: new Date().toISOString(), rows: matched, saved: false } }));
    } catch {
      setErrors(prev => ({ ...prev, [sup]: 'Error al leer el archivo. Asegurate de que sea .xlsx o .csv.' }));
    }
  }

  function handleSave(sup: string) {
    const state = states[sup];
    if (!state || !onBatchUpdatePVP) return;
    const updates = state.rows
      .filter(r => r.matched)
      .map(r => ({ id: r.matched!.id, pvp: r.filePvp }));
    if (updates.length > 0) {
      onBatchUpdatePVP(updates);
      setStates(prev => ({ ...prev, [sup]: { ...state, saved: true } }));
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 text-sm text-gray-500">
        Subí tu lista de precios sugeridos (PVP) por supermercado. El sistema la compara con los precios relevados en góndola.
        <br />
        <span className="text-xs text-gray-400">Formato: Excel (.xlsx) o CSV con columnas <strong>Descripción</strong> + <strong>PVP</strong> (o Precio)</span>
      </div>

      {/* 2x2 grid of super upload cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SUPERS.map(sup => {
          const st = states[sup];
          const err = errors[sup];
          const style = SUPER_STYLE[sup];
          const matchedCount = st?.rows.filter(r => r.matched).length ?? 0;
          const unmatchedCount = st ? st.rows.length - matchedCount : 0;

          return (
            <div key={sup} className={`bg-white rounded-xl border-2 ${st ? style.border : 'border-gray-200'} overflow-hidden`}>
              {/* Header */}
              <div className={`px-4 py-3 ${st ? style.bg : 'bg-gray-50'} border-b ${st ? style.border : 'border-gray-100'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <SuperLogo name={sup} size={28} />
                  <div>
                    <div className={`text-sm font-bold ${st ? style.text : 'text-gray-700'}`}>{sup}</div>
                    {st ? (
                      <div className="text-xs text-gray-500">
                        {st.rows.length} filas · {matchedCount} matcheadas · {unmatchedCount} sin match
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Sin lista cargada</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {st && !st.saved && onBatchUpdatePVP && matchedCount > 0 && (
                    <button
                      onClick={() => handleSave(sup)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${style.bg} ${style.text} border ${style.border} hover:opacity-80 transition-opacity`}
                    >
                      Guardar {matchedCount} PVPs
                    </button>
                  )}
                  {st?.saved && (
                    <span className="text-xs text-green-600 font-semibold px-2 py-1">✓ Guardado</span>
                  )}
                  <input
                    ref={el => { fileRefs.current[sup] = el; }}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={e => handleFile(sup, e)}
                  />
                  <button
                    onClick={() => fileRefs.current[sup]?.click()}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-gray-400 text-gray-600 transition-colors"
                  >
                    {st ? '↑ Reemplazar' : '↑ Subir lista'}
                  </button>
                </div>
              </div>

              {err && (
                <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-b border-red-100">{err}</div>
              )}

              {/* Matched rows table */}
              {st && (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Mi descripción</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Producto en góndola</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">Mi PVP</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">Precio actual</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">GAP %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {st.rows.map((row, i) => (
                        <tr key={i} className={`${row.matched ? 'hover:bg-gray-50' : 'opacity-50'}`}>
                          <td className="px-3 py-2 max-w-32 truncate text-gray-700" title={row.fileDesc}>{row.fileDesc}</td>
                          <td className="px-3 py-2 max-w-40 truncate text-gray-500" title={row.matched?.name ?? '—'}>
                            {row.matched ? row.matched.name : <span className="italic text-gray-300">no encontrado</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-700">{formatPrice(row.filePvp)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">
                            {row.matched ? formatPrice(row.matched.publishedPrice) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {row.gap !== null ? (
                              <span className={`font-bold ${row.gap > 5 ? 'text-red-500' : row.gap < -5 ? 'text-green-600' : 'text-gray-500'}`}>
                                {row.gap > 0 ? '+' : ''}{row.gap}%
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!st && !err && (
                <div className="px-4 py-8 text-center text-gray-300 text-xs">
                  Subí una lista Excel o CSV con la descripción del producto y el PVP sugerido
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 text-xs text-gray-500">
        <strong>GAP%</strong> = (Precio góndola − Mi PVP) / Mi PVP × 100 &nbsp;·&nbsp;
        <span className="text-red-500 font-semibold">Rojo</span>: góndola más cara que mi PVP &nbsp;·&nbsp;
        <span className="text-green-600 font-semibold">Verde</span>: góndola más barata que mi PVP
      </div>
    </div>
  );
}
