'use client';
import { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product } from '@/types';
import { TARGET_BRANDS, SUPERMARKETS, SUPERMARKET_COLORS, formatPrice, formatPct } from '@/lib/utils';

interface Props {
  products: Product[];
  onUpdatePVP: (id: string, pvp: number) => void;
  onBatchUpdatePVP?: (updates: Array<{ id: string; pvp: number }>) => void;
}

export default function PriceTable({ products, onUpdatePVP, onBatchUpdatePVP }: Props) {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [supermarket, setSupermarket] = useState('');
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [sortBy, setSortBy] = useState<keyof Product>('brand');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [editId, setEditId] = useState<string|null>(null);
  const [editVal, setEditVal] = useState('');
  const [pvpMsg, setPvpMsg] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return products
      .filter(p => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.brand.toLowerCase().includes(search.toLowerCase())) return false;
        if (brand && p.brand !== brand) return false;
        if (supermarket && p.supermarket !== supermarket) return false;
        if (onlyOffers && !p.offerPrice) return false;
        return true;
      })
      .sort((a, b) => {
        const va = a[sortBy] ?? 0; const vb = b[sortBy] ?? 0;
        const cmp = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb), 'es');
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [products, search, brand, supermarket, onlyOffers, sortBy, sortDir]);

  function toggleSort(col: keyof Product) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  function savePVP(id: string) {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v > 0) onUpdatePVP(id, v);
    setEditId(null);
  }

  async function handlePvpFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPvpMsg({ type: 'info', text: 'Procesando archivo...' });
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
      if (rows.length < 2) { setPvpMsg({ type: 'error', text: 'El archivo está vacío o no tiene datos.' }); return; }

      // Detect header row: look for a column with "precio", "pvp" or "price" and one with "producto", "nombre", "marca"
      const header = rows[0].map(c => String(c).toLowerCase().trim());
      const priceColIdx = header.findIndex(h => h.includes('pvp') || h.includes('precio') || h.includes('price') || h.includes('$'));
      const nameColIdx = header.findIndex(h => h.includes('producto') || h.includes('nombre') || h.includes('name') || h.includes('descripcion'));
      const brandColIdx = header.findIndex(h => h.includes('marca') || h.includes('brand'));

      if (priceColIdx < 0) { setPvpMsg({ type: 'error', text: 'No se encontró columna de precios. El archivo debe tener una columna "PVP", "Precio" o "$".' }); return; }

      const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''));
      const updates: Array<{ id: string; pvp: number }> = [];

      for (const row of dataRows) {
        const rawPrice = String(row[priceColIdx] ?? '').replace(/[^\d.,]/g, '').replace(',', '.');
        const pvp = parseFloat(rawPrice);
        if (!pvp || pvp <= 0) continue;

        const rowName = nameColIdx >= 0 ? String(row[nameColIdx]).toLowerCase() : '';
        const rowBrand = brandColIdx >= 0 ? String(row[brandColIdx]).toLowerCase() : '';
        const searchText = (rowName + ' ' + rowBrand).trim();
        if (!searchText) continue;

        for (const p of products) {
          const match = (rowName && p.name.toLowerCase().includes(rowName)) ||
                        (rowBrand && p.brand.toLowerCase().includes(rowBrand)) ||
                        (searchText && p.name.toLowerCase().includes(searchText));
          if (match && !updates.find(u => u.id === p.id)) {
            updates.push({ id: p.id, pvp });
          }
        }
      }

      if (updates.length === 0) {
        setPvpMsg({ type: 'error', text: 'No se encontraron coincidencias con los productos actuales. Revisá los nombres de columnas (Producto/Marca/PVP).' });
        return;
      }

      if (onBatchUpdatePVP) {
        onBatchUpdatePVP(updates);
      } else {
        for (const u of updates) onUpdatePVP(u.id, u.pvp);
      }
      setPvpMsg({ type: 'ok', text: `✅ ${updates.length} productos actualizados con PVP sugerido.` });
      setTimeout(() => setPvpMsg(null), 5000);
    } catch {
      setPvpMsg({ type: 'error', text: 'Error al leer el archivo. Asegurate de que sea Excel (.xlsx) o CSV.' });
    }
  }

  const Th = ({ col, label, right }: { col: keyof Product; label: string; right?: boolean }) => (
    <th onClick={() => toggleSort(col)} className={`px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 whitespace-nowrap select-none ${right ? 'text-right' : 'text-left'}`}>
      {label}{sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
    </th>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center">
        <input type="text" placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={brand} onChange={e => setBrand(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas las marcas</option>
          {TARGET_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={supermarket} onChange={e => setSupermarket(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los supers</option>
          {SUPERMARKETS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={onlyOffers} onChange={e => setOnlyOffers(e.target.checked)} className="rounded" />
          Solo ofertas
        </label>
        <div className="flex gap-2 ml-auto flex-wrap">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handlePvpFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors border border-blue-200 whitespace-nowrap"
            title="Subir lista de PVP sugerido en Excel o CSV"
          >
            ↑ Subir PVP
          </button>
          <a href="/api/export?format=csv" className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors">↓ CSV</a>
          <a href="/api/export?format=excel" className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors">↓ Excel</a>
        </div>
        <span className="text-xs text-gray-400">{filtered.length} resultados</span>
      </div>
      {pvpMsg && (
        <div className={`px-4 py-2 text-xs font-medium border-b ${
          pvpMsg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-100'
          : pvpMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-100'
          : 'bg-blue-50 text-blue-700 border-blue-100'
        }`}>
          {pvpMsg.text}
          {pvpMsg.type !== 'info' && (
            <span className="ml-2 text-gray-400 font-normal">
              Formato esperado: columnas "Producto" (o "Marca") + "PVP" (o "Precio")
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <Th col="name" label="Producto" />
              <Th col="brand" label="Marca" />
              <Th col="supermarket" label="Supermercado" />
              <Th col="publishedPrice" label="Precio" right />
              <Th col="regularPrice" label="Regular" right />
              <Th col="offerPrice" label="Oferta" right />
              <Th col="discount" label="Dto." right />
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase text-right">PVP Sug.</th>
              <Th col="gapPercent" label="GAP %" right />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-16 text-center text-gray-400 text-sm">
                {products.length === 0 ? 'Sin datos. Presioná "Actualizar" para ejecutar el scraping.' : 'Sin resultados para los filtros aplicados.'}
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                <td className="px-3 py-2.5 max-w-56">
                  <a href={p.url} target="_blank" rel="noopener" className="font-medium text-gray-800 hover:text-blue-600 line-clamp-2 text-xs leading-tight" title={p.name}>{p.name}</a>
                </td>
                <td className="px-3 py-2.5">
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap">{p.brand}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${SUPERMARKET_COLORS[p.supermarket] || 'bg-gray-100 text-gray-700'}`}>{p.supermarket}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-900 text-sm">{formatPrice(p.publishedPrice)}</td>
                <td className="px-3 py-2.5 text-right text-gray-400 text-xs">{formatPrice(p.regularPrice)}</td>
                <td className="px-3 py-2.5 text-right text-green-600 text-xs font-medium">{formatPrice(p.offerPrice)}</td>
                <td className="px-3 py-2.5 text-right">
                  {p.discount ? <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-bold">-{p.discount}%</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {editId === p.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') savePVP(p.id); if (e.key === 'Escape') setEditId(null); }}
                        className="w-20 border border-blue-300 rounded px-1.5 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <button onClick={() => savePVP(p.id)} className="text-green-600 text-xs font-bold">✓</button>
                      <button onClick={() => setEditId(null)} className="text-red-400 text-xs">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditId(p.id); setEditVal(String(p.pvpSugerido || '')); }}
                      className="text-xs text-gray-400 hover:text-blue-600 w-full text-right">
                      {p.pvpSugerido ? formatPrice(p.pvpSugerido) : <span className="italic">+ PVP</span>}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {p.gapPercent !== null
                    ? <span className={`text-xs font-bold ${p.gapPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatPct(p.gapPercent)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
