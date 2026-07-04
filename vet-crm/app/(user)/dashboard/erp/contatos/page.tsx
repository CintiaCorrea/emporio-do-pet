'use client';

// Roupagem repaginada 04/07 para o padrão Base44 (bege + emojis) — LÓGICA 100% preservada.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { confirmDelete } from '@/lib/ui/confirmDelete';

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // titulos / texto forte
const GREEN = '#0f6e56';     // sucesso
const BG = '#F6F2EA';        // fundo da pagina
const SOFT = '#FBF9F4';      // areas suaves
const TINT = '#E0F4F6';      // agua (avatar)
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

const thStyle: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '12px 16px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '14px 16px', borderBottom: `1px solid ${DIV}`, color: TXT };
const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14 };
const inputStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, color: TXT, outline: 'none' };

const iniciais = (nome: string) =>
  (nome || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?';

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
          <div className="animate-spin rounded-full h-12 w-12 mx-auto" style={{ borderBottom: `2px solid ${TEAL}` }}></div>
          <p className="mt-4" style={{ color: TXT2 }}>Carregando contatos...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-12 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="mt-4 text-lg" style={{ fontWeight: 500, color: TEAL_DARK }}>Erro ao carregar contatos</h3>
          <p className="mt-2" style={{ color: TXT2 }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 rounded-lg transition-colors"
            style={{ background: TEAL, color: '#fff' }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (visibleContacts.length === 0) {
      return (
        <div className="p-12 text-center">
          <span style={{fontSize:"32px"}}>📞</span>
          <h3 className="mt-4 text-lg" style={{ fontWeight: 500, color: TEAL_DARK }}>Nenhum contato encontrado</h3>
          <p className="mt-2" style={{ color: TXT2 }}>Tente ajustar os filtros ou cadastre um novo contato.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: SOFT }}>
              <th style={thStyle}>Tutor</th>
              <th style={thStyle}>Contato</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Flags</th>
              <th style={thStyle}>Obs.</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visibleContacts.map((c) => (
              <tr key={c.id} style={{ transition: 'background .2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = SOFT)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <td style={tdStyle}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center" style={{ background: TINT, color: TEAL_DARK, fontWeight: 500, fontSize: 13 }}>
                      {iniciais(c.tutor?.name || 'Tutor')}
                    </div>
                    <div className="ml-4 min-w-0">
                      <div className="text-sm truncate" style={{ fontWeight: 500, color: TEAL_DARK }}>
                        {c.tutor?.name || 'Tutor'}
                      </div>
                      <div className="text-sm truncate" style={{ color: TXT3 }}>{c.tutor?.cpf || 'CPF não informado'}</div>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm" style={{ color: TXT2 }}>
                      <span style={{fontSize:"14px"}}>📞</span>
                      {c.number}
                    </div>
                    {c.isWhatsApp && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: TXT2 }}>
                        <span style={{fontSize:"14px"}}>✉️</span>
                        WhatsApp
                      </div>
                    )}
                  </div>
                </td>
                <td style={tdStyle}>
                  <span className="inline-flex items-center px-3 py-1 text-sm" style={{ borderRadius: 999, fontWeight: 500, background: DIV, color: TXT2 }}>
                    {formatContactType(c.type)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div className="flex items-center gap-2">
                    {c.isPrimary && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm" style={{ borderRadius: 999, fontWeight: 500, background: TINT, color: TEAL_DARK }}>
                        <span style={{fontSize:"14px"}}>⭐</span>
                        Principal
                      </span>
                    )}
                    {c.isWhatsApp && (
                      <span className="inline-flex items-center px-3 py-1 text-sm" style={{ borderRadius: 999, fontWeight: 500, background: TINT, color: GREEN }}>
                        WhatsApp
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ ...tdStyle, color: TXT2, fontSize: 14 }}>
                  <span className="line-clamp-2">{c.observations || '—'}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <div className="flex justify-end space-x-1">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#D85A30' }}
                      title="Excluir"
                    >
                      <span style={{fontSize:"15px"}}>🗑️</span>
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
    <div className="min-h-screen w-full overflow-hidden" style={{ background: BG }}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/dashboard/erp/tutores"
                className="flex items-center gap-2 transition-colors"
                style={{ color: TEAL }}
              >
                <span style={{fontSize:"15px"}}>←</span>
                <span>Voltar para ERP</span>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl flex items-center gap-2" style={{ fontWeight: 500, color: TEAL_DARK }}>
                  <span>📞</span> Contatos
                </h1>
                <p className="mt-2" style={{ color: TXT2 }}>Gerencie os contatos vinculados aos tutores</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard/erp/tutores/novo"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 transition-colors"
                  style={{ background: TEAL, color: '#fff', borderRadius: 9 }}
                >
                  <span style={{fontSize:"15px"}}>➕</span>
                  <span style={{ fontWeight: 500 }}>Novo Tutor</span>
                </Link>
                <Link
                  href="/dashboard/erp/clientes/novo"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 transition-colors"
                  style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, color: TXT2 }}
                >
                  <span style={{fontSize:"15px"}}>➕</span>
                  <span style={{ fontWeight: 500 }}>Novo Contato</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Contatos (página)', value: stats.totalLocal, emoji: '📞' },
              { label: 'Com WhatsApp', value: stats.whats, emoji: '✉️' },
              { label: 'Principais', value: stats.primary, emoji: '⭐' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="p-6"
                style={cardStyle}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm mb-2" style={{ fontWeight: 500, color: TXT2 }}>{stat.label}</p>
                    <p className="text-3xl" style={{ fontWeight: 500, color: TEAL_DARK }}>
                      {stat.value}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: TINT }}>
                    <span style={{fontSize:"20px"}}>{stat.emoji}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!error && (
            <div className="p-6 mb-6" style={cardStyle}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span style={{fontSize:"15px"}}>🔍</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por tutor, número ou observação..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 transition-colors"
                    style={inputStyle}
                  />
                </div>

                <div className="md:col-span-4">
                  <div className="flex items-center space-x-2">
                    <span style={{fontSize:"15px"}}>🔍</span>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full px-4 py-3 transition-colors"
                      style={inputStyle}
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 transition-colors"
                    style={
                      onlyPrimary
                        ? { background: TINT, border: `1px solid ${TEAL}`, borderRadius: 9, color: TEAL_DARK }
                        : { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, color: TXT2 }
                    }
                    title="Mostrar apenas principais"
                  >
                    <span style={{fontSize:"15px"}}>⭐</span>
                    <span style={{ fontWeight: 500 }}>{onlyPrimary ? 'Principais' : 'Todos'}</span>
                  </button>
                </div>

                <div className="md:col-span-1">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 transition-colors" style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, color: TXT2 }}>
                    <span style={{fontSize:"15px"}}>⬇️</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-hidden" style={cardStyle}>
            {renderContent()}

            {!loading && !error && pages > 1 && (
              <div className="px-6 py-4" style={{ borderTop: `1px solid ${LINE}`, background: SOFT }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm" style={{ color: TXT2 }}>
                    Página <span style={{ fontWeight: 500 }}>{page}</span> de{' '}
                    <span style={{ fontWeight: 500 }}>{pages}</span> • Total:{' '}
                    <span style={{ fontWeight: 500 }}>{total}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontWeight: 500, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, color: TXT2 }}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page >= pages}
                      className="px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontWeight: 500, background: TEAL, color: '#fff', borderRadius: 9 }}
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
