'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  LuArrowLeft,
  LuDownload,
  LuPhone,
  LuPlus,
  LuSearch,
  LuTrash,
  LuUser} from 'react-icons/lu';

type ContactType = 'MOBILE' | 'PHONE' | 'BUSINESS';

interface TutorLite {
  id: string;
  name: string;
  cpf?: string | null;
}

interface Contact {
  id: string;
  type: ContactType;
  number: string;
  isWhatsApp: boolean;
  observations?: string | null;
  isPrimary: boolean;
  createdAt: string;
  tutor: TutorLite;
}

interface ContactsResponse {
  contacts: Contact[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function formatContactType(type: ContactType) {
  switch (type) {
    case 'MOBILE':
      return 'Celular';
    case 'PHONE':
      return 'Fixo';
    case 'BUSINESS':
      return 'Comercial';
    default:
      return type;
  }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | ContactType>('all');
  const [onlyPrimary, setOnlyPrimary] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const sp = new URLSearchParams();
        sp.set('page', String(page));
        sp.set('limit', '20');
        if (searchTerm.trim()) sp.set('search', searchTerm.trim());

        const res = await fetch(`/api/contacts?${sp.toString()}`, { signal: controller.signal });
        const raw = await res.text();
        const data = (raw ? (JSON.parse(raw) as ContactsResponse | { error?: string }) : null) as any;

        if (!res.ok) {
          const message = (data && (data.error || data.message)) || `Erro ${res.status}`;
          throw new Error(String(message));
        }

        const normalized = data as ContactsResponse;
        const list = Array.isArray(normalized?.contacts) ? normalized.contacts : [];
        const pg = normalized?.pagination;

        if (cancelled) return;

        setContacts(list);
        setPages(typeof pg?.pages === 'number' && pg.pages > 0 ? pg.pages : 1);
        setTotal(typeof pg?.total === 'number' ? pg.total : list.length);
      } catch (e) {
        if (cancelled) return;
        if ((e as any)?.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Erro desconhecido ao carregar contatos');
        setContacts([]);
        setPages(1);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [page, searchTerm]);

  // Quando mudar filtros locais, voltar para a primeira página
  useEffect(() => {
    setPage(1);
  }, [filterType, onlyPrimary]);

  const visibleContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (onlyPrimary && !c.isPrimary) return false;
      return true;
    });
  }, [contacts, filterType, onlyPrimary]);

  const stats = useMemo(() => {
    const totalLocal = contacts.length;
    const whats = contacts.filter((c) => c.isWhatsApp).length;
    const primary = contacts.filter((c) => c.isPrimary).length;
    return { totalLocal, whats, primary };
  }, [contacts]);

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete({ entityLabel: "contato", itemName: "este contato" }))) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Erro ${res.status}`);
      }
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contato excluído com sucesso!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir contato');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando contatos...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-12 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Erro ao carregar contatos</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (visibleContacts.length === 0) {
      return (
        <div className="p-12 text-center">
          <span style={{fontSize:"14px"}}>👥</span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Nenhum contato encontrado</h3>
          <p className="mt-2 text-gray-600">Tente ajustar os filtros ou cadastre um novo contato.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tutor</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contato</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tipo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Flags</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Obs.</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {visibleContacts.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <LuUser className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {c.tutor?.name || 'Tutor'}
                      </div>
                      <div className="text-sm text-gray-500 truncate">{c.tutor?.cpf || 'CPF não informado'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <LuPhone className="w-4 h-4 mr-2 text-gray-400" />
                      {c.number}
                    </div>
                    {c.isWhatsApp && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span style={{fontSize:"14px"}}>✉</span>
                        WhatsApp
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                    {formatContactType(c.type)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {c.isPrimary && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                        <span style={{fontSize:"14px"}}>⭐</span>
                        Principal
                      </span>
                    )}
                    {c.isWhatsApp && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                        WhatsApp
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <span className="line-clamp-2">{c.observations || '—'}</span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-110"
                      title="Excluir"
                    >
                      <LuTrash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/dashboard/erp/tutores"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-300"
              >
                <LuArrowLeft className="w-5 h-5" />
                <span>Voltar para ERP</span>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Contatos
                </h1>
                <p className="text-gray-600 mt-2">Gerencie os contatos vinculados aos tutores</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard/erp/tutores/novo"
                  className="group flex items-center justify-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
                >
                  <LuPlus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="font-semibold">Novo Tutor</span>
                </Link>
                <Link
                  href="/dashboard/erp/tutores/novo"
                  className="group flex items-center justify-center gap-2 px-6 py-3 text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                >
                  <LuPlus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="font-semibold">Novo Contato</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Contatos (página)', value: stats.totalLocal, color: 'blue', icon: () => <span style={{fontSize:"14px"}}>👥</span> },
              { label: 'Com WhatsApp', value: stats.whats, color: 'green', icon: () => <span style={{fontSize:"14px"}}>✉</span> },
              { label: 'Principais', value: stats.primary, color: 'yellow', icon: () => <span style={{fontSize:"14px"}}>⭐</span> },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 p-6 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-2xl ${
                      stat.color === 'blue'
                        ? 'bg-blue-50'
                        : stat.color === 'green'
                          ? 'bg-green-50'
                          : 'bg-yellow-50'
                    }`}
                  >
                    <stat.icon
                      className={`w-6 h-6 ${
                        stat.color === 'blue'
                          ? 'text-blue-600'
                          : stat.color === 'green'
                            ? 'text-green-600'
                            : 'text-yellow-700'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!error && (
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LuSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por tutor, número ou observação..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  />
                </div>

                <div className="md:col-span-4">
                  <div className="flex items-center space-x-2">
                    <span style={{fontSize:"14px"}}>⌕</span>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    >
                      <option value="all">Todos os tipos</option>
                      <option value="MOBILE">Celular</option>
                      <option value="PHONE">Fixo</option>
                      <option value="BUSINESS">Comercial</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <button
                    onClick={() => setOnlyPrimary((v) => !v)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 ${
                      onlyPrimary
                        ? 'text-yellow-900 bg-yellow-100 border border-yellow-200'
                        : 'text-gray-700 bg-white/80 border border-gray-200/80 hover:bg-white hover:border-gray-300 hover:shadow-lg focus:ring-gray-500/50'
                    }`}
                    title="Mostrar apenas principais"
                  >
                    <span style={{fontSize:"14px"}}>⭐</span>
                    <span className="font-semibold">{onlyPrimary ? 'Principais' : 'Todos'}</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden">
            {renderContent()}

            {!loading && !error && pages > 1 && (
              <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-white to-white/95">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Página <span className="font-semibold">{page}</span> de{' '}
                    <span className="font-semibold">{pages}</span> • Total:{' '}
                    <span className="font-semibold">{total}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page >= pages}
                      className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

