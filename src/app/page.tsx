'use client';
import { useState, useEffect, useCallback } from 'react';
import { Product, PriceHistoryEntry, Alert } from '@/types';
import PriceTable from '@/components/PriceTable';
import Comparador from '@/components/Comparador';
import Ofertas from '@/components/Ofertas';
import Alertas from '@/components/Alertas';
import Cobertura from '@/components/Cobertura';
import Historico from '@/components/Historico';
import BimboAnalysis from '@/components/BimboAnalysis';
import Comparativa from '@/components/Comparativa';

type Tab = 'bimbo'|'catalogo'|'comparador'|'ofertas'|'alertas'|'cobertura'|'historico'|'comparativa';

export default function Home() {
  const [tab, setTab] = useState<Tab>('bimbo');
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<{type:'ok'|'error'; text:string}|null>(null);
  const [lastUpdate, setLastUpdate] = useState<string|null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      setProducts(data.products || []);
      setHistory(data.history || []);
      setAlerts(data.alerts || []);
      if (data.products?.length) {
        const latest = data.products.reduce((a: Product, b: Product) =>
          new Date(a.scrapedAt) > new Date(b.scrapedAt) ? a : b);
        setLastUpdate(latest.scrapedAt);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleScrape() {
    setScraping(true); setScrapeMsg(null);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const now = new Date().toISOString();
        setLastUpdate(now);
        setScrapeMsg({ type: 'ok', text: `✅ ${data.productsFound} productos actualizados · ${data.alertsGenerated} alertas · ${data.duration}` });
        await fetchData();
      } else {
        setScrapeMsg({ type: 'error', text: `⚠️ ${data.error || 'Error en el scraping'}` });
      }
    } catch { setScrapeMsg({ type: 'error', text: '❌ Error de conexión' }); }
    finally { setScraping(false); }
  }

  async function handleUpdatePVP(id: string, pvp: number) {
    await fetch('/api/prices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, pvp }) });
    await fetchData();
  }

  async function handleBatchUpdatePVP(updates: Array<{ id: string; pvp: number }>) {
    await Promise.all(updates.map(u =>
      fetch('/api/prices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, pvp: u.pvp }) })
    ));
    await fetchData();
  }

  const offerCount = products.filter(p => p.offerPrice).length;
  const brandCount = new Set(products.map(p => p.brand)).size;
  const superCount = new Set(products.map(p => p.supermarket)).size;
  const avgPrice = products.length ? Math.round(products.reduce((a, p) => a + p.publishedPrice, 0) / products.length) : 0;

  const TABS = [
    { id: 'bimbo',       label: 'Bimbo vs Comp.', count: null },
    { id: 'catalogo',    label: 'Catálogo',        count: products.length },
    { id: 'comparativa', label: 'Comparativa',     count: null },
    { id: 'comparador',  label: 'Comparador',      count: null },
    { id: 'ofertas',     label: 'Ofertas',         count: offerCount },
    { id: 'alertas',     label: 'Alertas',         count: alerts.length },
    { id: 'cobertura',   label: 'Cobertura',       count: null },
    { id: 'historico',   label: 'Histórico',       count: null },
  ];

  const tabContent: Record<Tab, React.ReactNode> = {
    bimbo:       <BimboAnalysis products={products} />,
    catalogo:    <PriceTable products={products} onUpdatePVP={handleUpdatePVP} onBatchUpdatePVP={handleBatchUpdatePVP} />,
    comparativa: <Comparativa products={products} />,
    comparador:  <Comparador products={products} />,
    ofertas:     <Ofertas products={products} />,
    alertas:     <Alertas alerts={alerts} />,
    cobertura:   <Cobertura products={products} />,
    historico:   <Historico history={history} />,
  };

  return (
    <div className="min-h-screen" style={{background:'#faf9f6'}}>

      {/* HEADER */}
      <header className="bg-white border-b-2 border-red-600 sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-lg">P</span>
            </div>
            <div>
              <div className="font-black text-gray-900 text-base leading-tight">PrecioUY</div>
              <div className="text-xs text-gray-400 leading-tight">Monitor de Supermercados</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdate && (
              <div className="text-right">
                <div className="text-xs text-gray-400 font-medium">Última actualización</div>
                <div className="text-xs font-semibold text-gray-700">
                  {new Date(lastUpdate).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            )}
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm"
            >
              <svg className={`w-4 h-4 ${scraping ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {scraping ? 'Actualizando...' : 'Actualizar precios'}
            </button>
          </div>
        </div>
      </header>

      {/* Mensaje resultado */}
      {scrapeMsg && (
        <div className={`px-4 py-2.5 text-sm font-medium text-center ${scrapeMsg.type === 'ok' ? 'bg-green-50 text-green-700 border-b border-green-100' : 'bg-red-50 text-red-700 border-b border-red-100'}`}>
          {scrapeMsg.text}
        </div>
      )}

      {/* TABS */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  tab === t.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Productos monitoreados</div>
          <div className="text-3xl font-black text-gray-900">{products.length}</div>
          {avgPrice > 0 && <div className="text-xs text-gray-400 mt-1">prom ${avgPrice.toLocaleString('es-UY')}</div>}
        </div>
        <div className="bg-white rounded-xl border-l-4 border-blue-500 border border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Marcas detectadas</div>
          <div className="text-3xl font-black text-gray-900">{brandCount}</div>
          <div className="text-xs text-gray-400 mt-1">{brandCount} configuradas</div>
        </div>
        <div className="bg-white rounded-xl border-l-4 border-orange-400 border border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Supers con productos</div>
          <div className="text-3xl font-black text-gray-900">{superCount}/4</div>
          <div className="text-xs text-gray-400 mt-1 truncate">
            {[...new Set(products.map(p => p.supermarket))].join(', ') || '—'}
          </div>
        </div>
        <div className="bg-white rounded-xl border-l-4 border-green-500 border border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ofertas activas</div>
          <div className="text-3xl font-black text-gray-900">{offerCount}</div>
          <div className="text-xs text-gray-400 mt-1">
            {products.length > 0 ? `${Math.round((offerCount / products.length) * 100)}% del catálogo` : '—'}
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-10">
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-10 h-10 animate-spin mx-auto mb-4 text-red-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-sm">Cargando datos...</p>
          </div>
        ) : tabContent[tab]}
      </main>
    </div>
  );
}
