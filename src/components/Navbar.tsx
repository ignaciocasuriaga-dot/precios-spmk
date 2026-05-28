'use client';
import { useState } from 'react';

interface Props {
  user: { email: string; name: string; role: string } | null;
  onLogout: () => void;
  onScrape: () => void;
  scraping: boolean;
  lastUpdate: string | null;
  alertCount: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'comparador', label: 'Comparador' },
  { id: 'ofertas', label: 'Ofertas' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'cobertura', label: 'Cobertura' },
  { id: 'historico', label: 'Histórico' },
];

export default function Navbar({ user, onLogout, onScrape, scraping, lastUpdate, alertCount, activeTab, onTabChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm">PrecioUY</span>
              <span className="text-gray-400 text-xs ml-2 hidden sm:inline">Monitor de Supermercados</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-gray-400 hidden md:block">
                Actualizado: {new Date(lastUpdate).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            )}
            {user ? (
              <>
                <button
                  onClick={onScrape}
                  disabled={scraping}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${scraping ? 'bg-blue-100 text-blue-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  <span className={scraping ? 'animate-spin inline-block' : ''}>↻</span>
                  {scraping ? 'Actualizando...' : 'Actualizar'}
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-600 hidden sm:block">{user.name}</span>
                  {user.role === 'admin' && (
                    <button onClick={() => onTabChange('admin')} className="text-xs text-purple-600 hover:text-purple-800 hidden sm:block">Admin</button>
                  )}
                  <button onClick={onLogout} className="text-xs text-gray-400 hover:text-red-500">Salir</button>
                </div>
              </>
            ) : (
              <button onClick={() => onTabChange('login')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                Iniciar sesión
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-t border-gray-100 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-800 border-b-2 border-transparent'
              }`}
            >
              {tab.label}
              {tab.id === 'alertas' && alertCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
