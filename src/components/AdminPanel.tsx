'use client';
import { useState, useEffect } from 'react';
import { User } from '@/types';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(d => { setUsers(d.users || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">Usuarios registrados</h2>
          <span className="text-xs text-gray-400">{users.length} usuarios</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Nombre','Email','Rol','Registrado'].map(h => <th key={h} className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 text-gray-800 text-xs">{u.name}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{u.email}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                </td>
                <td className="px-3 py-2.5 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('es-UY')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
