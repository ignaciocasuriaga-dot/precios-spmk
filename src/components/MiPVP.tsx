'use client';
import { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

interface Props {
  products: Product[];
}

interface PvpRow {
  desc: string;
  pvp: number;
  store: string | null;
  matched: Product | null;
  gap: number | null;
}

const STORE_OPTIONS = ['Tata', 'Disco', 'El Dorado', 'Tienda Inglesa', 'Todos'] as const;

function fuzzyMatch(needle: string, hay: string): boolean {
  const n = needle.toLowerCase().trim();
  const h = hay.toLowerCase();
  if (h === n) return true;
  const words = n.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return false;
  const score = words.filter(w => h.includes(w)).length / words.length;
  return score >= 0.4;
}

function matchRows(
  fileRows: Array<{ desc: string; pvp: number; store: string | null }>,
  products: Product[],
  storeOverride: string
): PvpRow[] {
  return fileRows.map(({ desc, pvp, store }) => {
    const effectiveStore = storeOverride !== '' ? storeOverride : (store || '');
    const pool = effectiveStore && effectiveStore !== 'Todos'
      ? products.filter(p => p.supermarket === effectiveStore)
      : products;

    let best: Product | null = null;
    let bestScore = 0;
    for (const p of pool) {
      const hay = p.name.toLowerCase();
      const needle = desc.toLowerCase().trim();
      if (hay === needle) { best = p; break; }
      const words = needle.split(/\s+/).filter(w => w.length > 2);
      const score = words.length > 0 ? words.filter(w => hay.includes(w)).length / words.length : 0;
      if (score > bestScore && score >= 0.4) { best = p; bestScore = score; }
    }

    const gap = best ? Math.round(((best.publishedPrice - pvp) / pvp) * 100) : null;
    return { desc, pvp, store, matched: best, gap };
  });
}

export default function MiPVP({ products }: Props) {
  const [rows, setRows] = useState<PvpRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [storeOverride, setStoreOverride] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.matched && !b.matched) return -1;
      if (!a.matched && b.matched) return 1;
      return 0;
    });
  }, [rows]);

  const matchedCount = rows.filter(r => r.matched).length;
  const unmatchedCount = rows.length - matchedCount;

  const gapStats = useMemo(() => {
    const matched = rows.filter(r => r.gap !== null);
    if (matched.length === 0) return null;
    const gaps = matched.map(r => r.gap!);
    const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    const above = gaps.filter(g => g > 0).length;
    const below = gaps.filter(g => g < 0).length;
    return { avg, above, below };
  }, [rows]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError(null);
    setLoading(true);
    setFileName(file.name);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileRows: Array<{ desc: string; pvp: number; store: string | null }> = [];

      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
        if (raw.length < 2) { setError('El archivo está vacío.'); setLoading(false); return; }
        const header = (raw[0] as unknown[]).map(c => String(c).toLowerCase().trim());
        const nameIdx = header.findIndex(h => h.includes('producto') || h.includes('descripcion') || h.includes('descripción') || h.includes('nombre') || h.includes('name'));
        const pvpIdx = header.findIndex(h => h.includes('pvp') || h.includes('precio') || h.includes('price') || h.includes('$'));
        const storeIdx = header.findIndex(h => h.includes('cadena') || h.includes('store') || h.includes('super'));
        if (pvpIdx < 0) { setError('No se encontró columna de precio (PVP, Precio, $).'); setLoading(false); return; }
        for (const row of (raw as unknown[][]).slice(1)) {
          if (!row.some(c => c !== '')) continue;
          const rawPrice = String(row[pvpIdx] ?? '').replace(/[^\d.,]/g, '').replace(',', '.');
          const pvp = parseFloat(rawPrice);
          if (!pvp || pvp <= 0) continue;
          const desc = nameIdx >= 0 ? String(row[nameIdx]).trim() : (row.find(c => c && String(c).length > 3) || '');
          if (!desc) continue;
          const store = storeIdx >= 0 ? String(row[storeIdx]).trim() : null;
          fileRows.push({ desc: String(desc), pvp, store: store || null });
        }
      } else if (ext === 'csv') {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { setError('El archivo está vacío.'); setLoading(false); return; }
        const sep = lines[0].includes(';') ? ';' : ',';
        const header = lines[0].split(sep).map(c => c.toLowerCase().trim().replace(/"/g, ''));
        const nameIdx = header.findIndex(h => h.includes('producto') || h.includes('descripcion') || h.includes('nombre') || h.includes('name'));
        const pvpIdx = header.findIndex(h => h.includes('pvp') || h.includes('precio') || h.includes('price') || h.includes('$'));
        const storeIdx = header.findIndex(h => h.includes('cadena') || h.includes('store') || h.includes('super'));
        if (pvpIdx < 0) { setError('No se encontró columna de precio (PVP, Precio, $).'); setLoading(false); return; }
        for (const line of lines.slice(1)) {
          const cols = line.split(sep).map(c => c.trim().replace(/"/g, ''));
          const rawPrice = (cols[pvpIdx] ?? '').replace(/[^\d.,]/g, '').replace(',', '.');
          const pvp = parseFloat(rawPrice);
          if (!pvp || pvp <= 0) continue;
          const desc = nameIdx >= 0 ? cols[nameIdx] : (cols.find(c => c.length > 3) || '');
          if (!desc) continue;
          const store = storeIdx >= 0 ? cols[storeIdx] : null;
          fileRows.push({ desc, pvp, store: store || null });
        }
      } else if (ext === 'json') {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) { setError('El JSON debe ser un array de objetos.'); setLoading(false); return; }
        for (const obj of data) {
          const desc = String(obj.name || obj.product || obj.descripcion || obj.nombre || '').trim();
          const pvpRaw = obj.pvp ?? obj.price ?? obj.precio;
          const pvp = typeof pvpRaw === 'number' ? pvpRaw : parseFloat(String(pvpRaw || '').replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!desc || !pvp || pvp <= 0) continue;
          const store = obj.store || obj.cadena || obj.super || null;
          fileRows.push({ desc, pvp, store: store ? String(store).trim() : null });
        }
      } else {
        setError('Formato no soportado. Usá .csv, .json, .xlsx o .xls.');
        setLoading(false);
        return;
      }

      if (fileRows.length === 0) {
        setError('No se encontraron filas con datos válidos. Revisá las columnas (Producto/Nombre + PVP/Precio).');
        setLoading(false);
        return;
      }

      const matched = matchRows(fileRows, products, storeOverride);
      setRows(matched);
    } catch {
      setError('Error al leer el archivo. Verificá que sea un archivo válido.');
    } finally {
      setLoading(false);
    }
  }

  function handleImport() {
    if (rows.length > 0) {
      // Re-match with current storeOverride
      const re = matchRows(rows.map(r => ({ desc: r.desc, pvp: r.pvp, store: r.store })), products, storeOverride);
      setRows(re);
    } else {
      fileRef.current?.click();
    }
  }

  function handleClear() {
    setRows([]);
    setFileName('');
    setError(null);
  }

  return (
    <div className="space-y-4">
      {/* Upload Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">
            Lista PVP{rows.length > 0 ? ` — ${rows.length} líneas` : ''}
          </h2>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Archivo</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,.xlsx,.xls"
                className="hidden"
                onChange={handleFile}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {fileName ? fileName : 'Seleccionar archivo (.csv/.json/.xlsx)'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadena</label>
            <select
              value={storeOverride}
              onChange={e => setStoreOverride(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Usar cadena del archivo</option>
              {STORE_OPTIONS.map(s => (
                <option key={s} value={s === 'Todos' ? 'Todos' : s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Procesando...' : 'Importar'}
            </button>
            <button
              onClick={handleClear}
              className="border border-gray-200 hover:border-gray-400 text-gray-600 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">{error}</div>
        )}

        {rows.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            <span className="font-semibold text-green-700">{matchedCount} productos matcheados</span>
            {' '}de {rows.length}
            {unmatchedCount > 0 && (
              <span className="text-gray-400"> · <span className="text-red-500">{unmatchedCount} sin match</span></span>
            )}
          </div>
        )}
      </div>

      {/* Results Table */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Producto</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Marca</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">Cadena</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">PVP</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">Precio góndola</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">GAP %</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((row, i) => (
                  <tr key={i} className={`hover:bg-gray-50/50 ${!row.matched ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2.5 max-w-48">
                      <div className="text-xs text-gray-700 line-clamp-2 font-medium" title={row.desc}>{row.desc}</div>
                      {row.matched && (
                        <div className="text-xs text-gray-400 line-clamp-1 mt-0.5" title={row.matched.name}>{row.matched.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.matched && (
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{row.matched.brand}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {row.matched?.supermarket || row.store || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700">{formatPrice(row.pvp)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-800">
                      {row.matched ? formatPrice(row.matched.publishedPrice) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.gap !== null ? (
                        <span className={`text-xs font-bold ${row.gap > 5 ? 'text-red-500' : row.gap < -5 ? 'text-green-600' : 'text-gray-600'}`}>
                          {row.gap > 0 ? '+' : ''}{row.gap}%
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.matched
                        ? <span className="text-green-500 font-bold text-base">✓</span>
                        : <span className="text-red-400 font-bold text-base">✗</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* GAP Summary */}
          {gapStats && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-4 text-xs text-gray-600">
              <span>GAP promedio: <strong className={gapStats.avg > 0 ? 'text-red-600' : 'text-green-600'}>{gapStats.avg > 0 ? '+' : ''}{gapStats.avg}%</strong></span>
              <span className="text-gray-300">·</span>
              <span>Sobre PVP: <strong className="text-red-500">{gapStats.above}</strong></span>
              <span className="text-gray-300">·</span>
              <span>Bajo PVP: <strong className="text-green-600">{gapStats.below}</strong></span>
            </div>
          )}
        </div>
      )}

      {rows.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Subí tu lista de PVP sugeridos para compararla con los precios en góndola.</p>
          <p className="text-xs mt-1 text-gray-300">Formatos: .csv, .json, .xlsx, .xls · Columnas: Producto/Descripción + PVP/Precio</p>
        </div>
      )}
    </div>
  );
}
