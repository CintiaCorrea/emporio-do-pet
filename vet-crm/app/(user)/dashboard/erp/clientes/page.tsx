'use client';

// ⚠️  REFACTOR EM PROGRESSO:
// Cliente unificado no Tutor (Tutor.classificacao = 'Cliente') em a672640.
// URL /api/clients/* mantida temporariamente como compat layer apontando pra /tutors no backend.
// Alguns campos podem não bater 100% com o backend até validação contra dados reais.

// Roupagem repaginada 04/07 para o padrão Base44 (bege + emojis) — LÓGICA 100% preservada.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import toast from 'react-hot-toast';

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

interface Tutor {
  id: string;
  contactName: string;
  email: string;
  phone: string;
  contactOwner: string;
  leadSource: string;
  status: 'active' | 'inactive' | 'lead' | 'customer';
  createdAt: string;
  lastContact: string;
}

export default function ClientsListPage() {
  const [clients, setClients] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'lead' | 'customer'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'website' | 'referral' | 'social' | 'event' | 'other'>('all');
  const [clientToDelete, setClientToDelete] = useState<Tutor | null>(null);

  // Buscar clientes da API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/clients');

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Garantir que data é um array
        if (!Array.isArray(data)) {
          console.warn('Dados recebidos não são um array:', data);
          setClients([]);
          return;
        }

        setClients(data);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido ao carregar clientes');
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Filtrar clientes - com validação adicional
  const filteredClients = Array.isArray(clients) ? clients.filter(client => {
    // Verificar se client tem as propriedades necessárias
    if (!client || typeof client !== 'object') return false;

    const contactName = client.contactName || '';
    const email = client.email || '';
    const phone = client.phone || '';
    const contactOwner = client.contactOwner || '';
    const leadSource = client.leadSource || '';
    const status = client.status || 'inactive';

    const matchesSearch = contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phone.includes(searchTerm) ||
                         contactOwner.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    const matchesSource = filterSource === 'all' ||
                         (filterSource === 'website' && leadSource.toLowerCase().includes('site')) ||
                         (filterSource === 'referral' && leadSource.toLowerCase().includes('indicação')) ||
                         (filterSource === 'social' && leadSource.toLowerCase().includes('social')) ||
                         (filterSource === 'event' && leadSource.toLowerCase().includes('evento')) ||
                         (filterSource === 'other' && leadSource && !['site', 'indicação', 'social', 'evento'].some(source => leadSource.toLowerCase().includes(source)));

    return matchesSearch && matchesStatus && matchesSource;
  }) : [];

  const requestDeleteClient = (client: Tutor) => {
    setClientToDelete(client);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    const res = await fetch(`/api/clients/${clientToDelete.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
        'Erro ao excluir cliente';
      throw new Error(message);
    }

    setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
    toast.success('Cliente excluído com sucesso!');
    setClientToDelete(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusColor = (status: string): React.CSSProperties => {
    switch (status) {
      case 'active':
        return { background: TINT, color: GREEN };
      case 'inactive':
        return { background: DIV, color: TXT2 };
      case 'lead':
        return { background: TINT, color: TEAL_DARK };
      case 'customer':
        return { background: TINT, color: TEAL };
      default:
        return { background: DIV, color: TXT2 };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'lead':
        return 'Lead';
      case 'customer':
        return 'Cliente';
      default:
        return status;
    }
  };

  const getSourceText = (source: string) => {
    if (!source) return 'Não informado';

    const sourceMap: { [key: string]: string } = {
      'website': 'Site',
      'referral': 'Indicação',
      'social': 'Redes Sociais',
      'event': 'Evento',
      'other': 'Outro'
    };

    return sourceMap[source.toLowerCase()] || source;
  };

  // Calcular estatísticas
  const stats = {
    total: clients.length,
    active: clients.filter(client => client.status === 'active').length,
    leads: clients.filter(client => client.status === 'lead').length,
    customers: clients.filter(client => client.status === 'customer').length
  };

  // Estado de renderização condicional
  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto" style={{ borderBottom: `2px solid ${TEAL}` }}></div>
          <p className="mt-4" style={{ color: TXT2 }}>Carregando clientes...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-12 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="mt-4 text-lg" style={{ fontWeight: 500, color: TEAL_DARK }}>Erro ao carregar clientes</h3>
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

    if (!Array.isArray(clients) || clients.length === 0) {
      return (
        <div className="p-12 text-center">
          <span style={{fontSize:"32px"}}>👤</span>
          <h3 className="mt-4 text-lg" style={{ fontWeight: 500, color: TEAL_DARK }}>
            Nenhum cliente cadastrado
          </h3>
          <p className="mt-2" style={{ color: TXT2 }}>
            Comece cadastrando o primeiro cliente
          </p>
        </div>
      );
    }

    if (filteredClients.length === 0) {
      return (
        <div className="p-12 text-center">
          <span style={{fontSize:"32px"}}>👤</span>
          <h3 className="mt-4 text-lg" style={{ fontWeight: 500, color: TEAL_DARK }}>
            Nenhum cliente encontrado
          </h3>
          <p className="mt-2" style={{ color: TXT2 }}>
            Tente ajustar os filtros de busca
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: SOFT }}>
              <th style={thStyle}>Cliente</th>
              <th style={thStyle}>Informações</th>
              <th style={thStyle}>Responsável</th>
              <th style={thStyle}>Fonte</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Último Contato</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id} style={{ transition: 'background .2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = SOFT)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <td style={tdStyle}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center" style={{ background: TINT, color: TEAL_DARK, fontWeight: 500, fontSize: 13 }}>
                      {iniciais(client.contactName)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm" style={{ fontWeight: 500, color: TEAL_DARK }}>{client.contactName || 'Nome não informado'}</div>
                      <div className="text-sm" style={{ color: TXT3 }}>{client.email || 'Email não informado'}</div>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>
                  <div className="space-y-1">
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: TXT2 }}>
                        <span style={{fontSize:"14px"}}>✉️</span>
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: TXT2 }}>
                        <span style={{fontSize:"14px"}}>📞</span>
                        {client.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div className="text-sm" style={{ color: TXT }}>{client.contactOwner || 'Não atribuído'}</div>
                </td>
                <td style={tdStyle}>
                  <span className="inline-flex items-center px-3 py-1 text-sm" style={{ borderRadius: 999, fontWeight: 500, background: DIV, color: TXT2 }}>
                    {getSourceText(client.leadSource)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span className="inline-flex items-center px-3 py-1 text-sm" style={{ borderRadius: 999, fontWeight: 500, ...getStatusColor(client.status) }}>
                    {getStatusText(client.status)}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontSize: 14 }}>
                  {formatDate(client.lastContact)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <div className="flex justify-end space-x-1">
                    <Link
                      href={`/dashboard/erp/clientes/${client.id}`}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: TEAL }}
                      title="Visualizar"
                    >
                      <span style={{fontSize:"15px"}}>🔍</span>
                    </Link>
                    <Link
                      href={`/dashboard/erp/clientes/${client.id}/editar`}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: TEAL_DARK }}
                      title="Editar"
                    >
                      <span style={{fontSize:"15px"}}>✏️</span>
                    </Link>
                    <button
                      onClick={() => requestDeleteClient(client)}
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
      <ConfirmDeleteModal
        isOpen={Boolean(clientToDelete)}
        entityLabel="Cliente"
        itemName={clientToDelete?.contactName || '—'}
        consequenceText="Esta ação não pode ser desfeita. Os dados do cliente serão removidos."
        onClose={() => setClientToDelete(null)}
        onConfirm={confirmDeleteClient}
      />
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl flex items-center gap-2" style={{ fontWeight: 500, color: TEAL_DARK }}>
                    <span>👤</span> Clientes
                  </h1>
                  <p className="mt-2" style={{ color: TXT2 }}>
                    Gerencie todos os clientes cadastrados no sistema
                  </p>
                </div>
                <Link
                  href="/dashboard/erp/clientes/novo"
                  className="mt-4 sm:mt-0 flex items-center gap-2 px-5 py-2.5 transition-colors"
                  style={{ background: TEAL, color: '#fff', borderRadius: 9 }}
                >
                  <span style={{fontSize:"15px"}}>➕</span>
                  <span style={{ fontWeight: 500 }}>Novo Cliente</span>
                </Link>
              </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Total de Clientes", value: stats.total, emoji: "👤" },
                { label: "Clientes Ativos", value: stats.active, emoji: "✅" },
                { label: "Leads", value: stats.leads, emoji: "🔍" },
                { label: "Clientes Convertidos", value: stats.customers, emoji: "🐾" }
              ].map((stat, index) => (
                <div key={index} className="p-6" style={cardStyle}>
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

            {/* Filtros e Busca - Só mostra se não estiver em estado de erro */}
            {!error && (
              <div className="p-6 mb-6" style={cardStyle}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Barra de Pesquisa */}
                  <div className="md:col-span-4 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span style={{fontSize:"15px"}}>🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nome, email, telefone ou responsável..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 transition-colors"
                      style={inputStyle}
                    />
                  </div>

                  {/* Filtro de Status */}
                  <div className="md:col-span-3">
                    <div className="flex items-center space-x-2">
                      <span style={{fontSize:"15px"}}>🔍</span>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                        className="w-full px-4 py-3 transition-colors"
                        style={inputStyle}
                      >
                        <option value="all">Todos os status</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Inativos</option>
                        <option value="lead">Leads</option>
                        <option value="customer">Clientes</option>
                      </select>
                    </div>
                  </div>

                  {/* Filtro de Fonte */}
                  <div className="md:col-span-3">
                    <div className="flex items-center space-x-2">
                      <span style={{fontSize:"15px"}}>👤</span>
                      <select
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
                        className="w-full px-4 py-3 transition-colors"
                        style={inputStyle}
                      >
                        <option value="all">Todas as fontes</option>
                        <option value="website">Site</option>
                        <option value="referral">Indicação</option>
                        <option value="social">Redes Sociais</option>
                        <option value="event">Evento</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                  </div>

                  {/* Botão Exportar */}
                  <div className="md:col-span-2">
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 transition-colors" style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, color: TXT2 }}>
                      <span style={{fontSize:"15px"}}>⬇️</span>
                      <span style={{ fontWeight: 500 }}>Exportar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabela de Clientes */}
            <div className="overflow-hidden" style={cardStyle}>
              {renderContent()}

              {/* Paginação */}
              {!loading && !error && Array.isArray(clients) && clients.length > 0 && filteredClients.length > 0 && (
                <div className="px-6 py-4" style={{ borderTop: `1px solid ${LINE}`, background: SOFT }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: TXT2 }}>
                      Mostrando <span style={{ fontWeight: 500 }}>{filteredClients.length}</span> de{' '}
                      <span style={{ fontWeight: 500 }}>{clients.length}</span> clientes
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontWeight: 500, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, color: TXT2 }}>
                        Anterior
                      </button>
                      <button className="px-4 py-2 text-sm transition-colors" style={{ fontWeight: 500, background: TEAL, color: '#fff', borderRadius: 9 }}>
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
