'use client';
import { useState, useEffect, useCallback } from 'react';
import { Product, PriceHistoryEntry, Alert } from '@/types';
import Navbar from '@/components/Navbar';
import PriceTable from '@/components/PriceTable';
import Comparador from '@/components/Comparador';
import Ofertas from '@/components/Ofertas';
import Alertas from '@/components/Alertas';
import Cobertura from '@/components/Cobertura';
import Historico from '@/components/Historico';
import Login from '@/components/Login';
import AdminPanel from '@/components/AdminPanel';

type Tab = 'catalogo'|'comparador'|'ofertas'|'alertas'|'cobertura'|'historico'|'login'|'admin';

export default function Home() {
  const [tab, setTab] = useState<Tab>('catalogo');
  const [user, setUser] = useState<{ email: string; name: string; role: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<{type:'ok'|'error'; text:string}|null>(null);
  const [lastUpdate, setLastUpdate] = useState<string|null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [dataRes, authRes] = await Promise.all([fetch('/api/prices'), fetch('/api/auth')]);
      const data = await dataRes.json();
      const auth = await authRes.json();
      setProducts(data.products || []);
      setHistory(data.history || []);
      setAlerts(data.alerts || []);
      if (auth.user) setUser(auth.user);
      if (data.products?.length) {
        const latest = data.products.reduce((a: Product, b: Product) => new Date(a.scrapedAt) > new Date(b.scrapedAt) ? a : b);
        setLastUpdate(latest.scrapedAt);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleScrape() {
    if (!user) { setTab('login'); return; }
    setScraping(true); setScrapeMsg(null);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setScrapeMsg({ type: 'ok', text: `✅ ${data.productsFound} productos actualizados, ${data.alertsGenerated} alertas generadas (${data.duration})` });
        await fetchData();
      } else {
        setScrapeMsg({ type: 'error', text: `⚠️ ${data.error || 'Error en el scraping'}` });
      }
    } catch { setScrapeMsg({ type: 'error', text: '❌ Error de conexión' }); }
    finally { setScraping(false); }
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    setUser(null); setTab('catalogo');
  }

  async function handleUpdatePVP(id: string, pvp: number) {
    await fetch('/api/prices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, pvp }) });
    await fetchData();
  }

  const counts = { catalogo: products.length, comparador: 0, ofertas: products.filter(p => p.offerPrice).length, alertas: alerts.length };

  const tabContent = {
    catalogo: <PriceTable products={products} onUpdatePVP={handleUpdatePVP} />,
    comparador: <Comparador products={products} />,
    ofertas: <Ofertas products={products} />,
    alertas: <Alertas alerts={alerts} />,
    cobertura: <Cobertura products={products} />,
    historico: <Historico history={history} />,
    login: <Login onLogin={u => { setUser(u); setTab('catalogo'); }} />,
    admin: user?.role === 'admin' ? <AdminPanel /> : <div className="text-center py-16 text-gray-400">Acceso restringido.</div>,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        user={user} onLogout={handleLogout} onScrape={handleScrape} scraping={scraping}
        lastUpdate={lastUpdate} alertCount={alerts.length} activeTab={tab}
        onTabChange={t => setTab(t as Tab)}
      />

      {scrapeMsg && (
        <div className={`border-b px-4 py-2 text-xs font-medium ${scrapeMsg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
          <div className="max-w-screen-xl mx-auto">{scrapeMsg.text}</div>
        </div>
      )}

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex gap-6 overflow-x-auto">
          {[
            { label: 'Productos', value: products.length, icon: '📦' },
            { label: 'Marcas', value: new Set(products.map(p => p.brand)).size, icon: '🏷️' },
            { label: 'Supermercados', value: new Set(products.map(p => p.supermarket)).size, icon: '🏪' },
            { label: 'Ofertas', value: products.filter(p => p.offerPrice).length, icon: '🏷️' },
            { label: 'Alertas', value: alerts.length, icon: '🔔' },
            { label: 'Historial', value: history.length, icon: '📈' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base">{icon}</span>
              <span className="text-xl font-bold text-gray-900">{value}</span>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl animate-spin mb-4">⟳</div>
            <p className="text-sm">Cargando...</p>
          </div>
        ) : tabContent[tab]}
      </main>
    </div>
  );
}
