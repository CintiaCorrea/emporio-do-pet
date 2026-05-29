'use client';

import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

type Role = 'ADMIN' | 'VETERINARIAN' | 'RECEPTIONIST';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isApproved: boolean;
  isBlocked: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  VETERINARIAN: 'Veterinário(a)',
  RECEPTIONIST: 'Recepção',
};

const ROLE_BADGE: Record<Role, string> = {
  ADMIN: 'bg-emerald-100 text-emerald-800',
  VETERINARIAN: 'bg-blue-100 text-blue-800',
  RECEPTIONIST: 'bg-amber-100 text-amber-800',
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('RECEPTIONIST');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (e: any) {
      toast.error('Erro ao carregar usuários: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      toast.success(`Usuário ${name} criado!`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('RECEPTIONIST');
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster position="top-right" />
      <header className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-gray-600 mt-1">Usuários com acesso ao sistema</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
        >
          {showForm ? 'Cancelar' : '+ Novo usuário'}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Criar novo usuário</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                A pessoa pode trocar depois em "Alterar senha".
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="RECEPTIONIST">Recepção</option>
                <option value="VETERINARIAN">Veterinário(a)</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium"
            >
              {submitting ? 'Criando...' : 'Criar usuário'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Nenhum usuário cadastrado ainda.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nome</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">E-mail</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Papel</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{u.name || '—'}</td>
                  <td className="py-3 px-4 text-gray-700">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block text-xs px-2 py-1 rounded ${ROLE_BADGE[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.isBlocked ? (
                      <span className="text-red-600 text-sm">Bloqueado</span>
                    ) : u.isApproved ? (
                      <span className="text-emerald-600 text-sm">Ativo</span>
                    ) : (
                      <span className="text-amber-600 text-sm">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
