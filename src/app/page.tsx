'use client';
import { useState, useEffect, useCallback } from 'react';
import { Product, Alert } from '@/types';
import Alertas from '@/components/Alertas';
import Ofertas from '@/components/Ofertas';
import Comparativa from '@/components/Comparativa';
import MiPVP from '@/components/MiPVP';
import PriceTable from '@/components/PriceTable';
import Cobertura from '@/components/Cobertura';
import InformeGerencial from '@/components/InformeGerencial';

type Tab = 'catalogo' | 'comparador' | 'ofertas' | 'pvp' | 'cobertura' | 'exec';

export default function Home() {
  const [tab, setTab] = useState<Tab>('catalogo');
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      setProducts(data.products || []);
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
        setScrapeMsg({ type: 'ok', text: `✅ ${data.productsFound} productos · ${data.alertsGenerated} alertas · ${data.duration}` });
        await fetchData();
      } else {
        setScrapeMsg({ type: 'error', text: `⚠️ ${data.error || 'Error en el scraping'}` });
      }
    } catch { setScrapeMsg({ type: 'error', text: '❌ Error de conexión' }); }
    finally { setScraping(false); }
  }

  async function handleBatchUpdatePVP(updates: Array<{ id: string; pvp: number }>) {
    await Promise.all(updates.map(u =>
      fetch('/api/prices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, pvp: u.pvp }) })
    ));
    await fetchData();
  }

  async function handleUpdatePVP(id: string, pvp: number) {
    await fetch('/api/prices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, pvp }) });
    await fetchData();
  }

  const offerCount = products.filter(p => p.offerPrice).length;
  const brandCount = new Set(products.map(p => p.brand)).size;
  const superCount = new Set(products.map(p => p.supermarket)).size;

  const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    {
      id: 'catalogo',
      label: 'Catálogo',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'comparador',
      label: 'Comparador',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'ofertas',
      label: 'Ofertas',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      id: 'pvp',
      label: 'PVP',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'cobertura',
      label: 'Cobertura',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'exec',
      label: 'Informe Gerencial',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#faf9f6' }}>

      {/* HEADER */}
      <header className="bg-white border-b-2 border-red-600 sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {!logoError ? (
              <img
                src="/logo.jpg"
                alt="Grupo Bimbo"
                className="h-10 w-auto object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-lg">B</span>
              </div>
            )}
            <div>
              <div className="font-black text-gray-900 text-base leading-tight">Monitor Bimbo UY</div>
              <div className="text-xs text-gray-400 leading-tight">Precios en supermercados</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <div className="hidden sm:block text-right">
                <div className="text-xs text-gray-400">Última actualización</div>
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

      {/* Mensaje resultado scraping */}
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
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI BAR */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-black text-gray-900">{products.length}</div>
                <div className="text-xs text-gray-500">Productos relevados</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-black text-gray-900">{brandCount}</div>
                <div className="text-xs text-gray-500">Marcas</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-black text-gray-900">{superCount}</div>
                <div className="text-xs text-gray-500">Supers</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-black text-gray-900">{offerCount}</div>
                <div className="text-xs text-gray-500">En oferta</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 pb-12">
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-10 h-10 animate-spin mx-auto mb-4 text-red-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm">Cargando datos...</p>
          </div>
        ) : (
          <>
            {tab === 'catalogo' && <PriceTable products={products} onUpdatePVP={handleUpdatePVP} onBatchUpdatePVP={handleBatchUpdatePVP} />}
            {tab === 'comparador' && <Comparativa products={products} />}
            {tab === 'ofertas' && <Ofertas products={products} />}
            {tab === 'pvp' && <MiPVP products={products} />}
            {tab === 'cobertura' && <Cobertura products={products} />}
            {tab === 'exec' && <InformeGerencial products={products} />}
          </>
        )}
      </main>

      {/* Alertas kept hidden for state management */}
      <div className="hidden">
        <Alertas alerts={alerts} />
      </div>
    </div>
  );
}
