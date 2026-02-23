'use client';

import { useState, useEffect } from 'react';
import { LuPlus, LuSearch, LuPencil, LuTrash2, LuUsers, LuFilter, LuDownload, LuEye, LuMail, LuPhone, LuUser } from 'react-icons/lu';
import Link from 'next/link';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import toast from 'react-hot-toast';

interface Client {
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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'lead' | 'customer'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'website' | 'referral' | 'social' | 'event' | 'other'>('all');
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

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

  const requestDeleteClient = (client: Client) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'lead':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando clientes...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-12 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Erro ao carregar clientes</h3>
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

    if (!Array.isArray(clients) || clients.length === 0) {
      return (
        <div className="p-12 text-center">
          <LuUsers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Nenhum cliente cadastrado
          </h3>
          <p className="mt-2 text-gray-600">
            Comece cadastrando o primeiro cliente
          </p>
        </div>
      );
    }

    if (filteredClients.length === 0) {
      return (
        <div className="p-12 text-center">
          <LuUsers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Nenhum cliente encontrado
          </h3>
          <p className="mt-2 text-gray-600">
            Tente ajustar os filtros de busca
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cliente</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Informações</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Responsável</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fonte</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Último Contato</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <LuUser className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold text-gray-900">{client.contactName || 'Nome não informado'}</div>
                      <div className="text-sm text-gray-500">{client.email || 'Email não informado'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {client.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <LuMail className="w-4 h-4 mr-2 text-gray-400" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <LuPhone className="w-4 h-4 mr-2 text-gray-400" />
                        {client.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{client.contactOwner || 'Não atribuído'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                    {getSourceText(client.leadSource)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(client.status)}`}>
                    {getStatusText(client.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatDate(client.lastContact)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <Link
                      href={`/dashboard/erp/clientes/${client.id}`}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
                      title="Visualizar"
                    >
                      <LuEye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/dashboard/erp/clientes/${client.id}/editar`}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all duration-300 hover:scale-110"
                      title="Editar"
                    >
                      <LuPencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => requestDeleteClient(client)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-110"
                      title="Excluir"
                    >
                      <LuTrash2 className="w-4 h-4" />
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
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Clientes
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie todos os clientes cadastrados no sistema
                  </p>
                </div>
                <Link
                  href="/dashboard/erp/clientes/novo"
                  className="group mt-4 sm:mt-0 flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
                >
                  <LuPlus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="font-semibold">Novo Cliente</span>
                </Link>
              </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Total de Clientes", value: stats.total, color: "blue", icon: LuUsers },
                { label: "Clientes Ativos", value: stats.active, color: "green", icon: LuUser },
                { label: "Leads", value: stats.leads, color: "purple", icon: LuUsers },
                { label: "Clientes Convertidos", value: stats.customers, color: "orange", icon: LuUser }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 p-6 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-2">{stat.label}</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-2xl ${
                      stat.color === 'blue' ? 'bg-blue-50' :
                      stat.color === 'green' ? 'bg-green-50' :
                      stat.color === 'purple' ? 'bg-purple-50' : 'bg-orange-50'
                    }`}>
                      <stat.icon className={`w-6 h-6 ${
                        stat.color === 'blue' ? 'text-blue-600' :
                        stat.color === 'green' ? 'text-green-600' :
                        stat.color === 'purple' ? 'text-purple-600' : 'text-orange-600'
                      }`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filtros e Busca - Só mostra se não estiver em estado de erro */}
            {!error && (
              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Barra de Pesquisa */}
                  <div className="md:col-span-4 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nome, email, telefone ou responsável..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>

                  {/* Filtro de Status */}
                  <div className="md:col-span-3">
                    <div className="flex items-center space-x-2">
                      <LuFilter className="h-5 w-5 text-gray-400" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
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
                      <LuUsers className="h-5 w-5 text-gray-400" />
                      <select
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
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
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500/50">
                      <LuDownload className="w-5 h-5" />
                      <span className="font-semibold">Exportar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabela de Clientes */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden">
              {renderContent()}

              {/* Paginação */}
              {!loading && !error && Array.isArray(clients) && clients.length > 0 && filteredClients.length > 0 && (
                <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-white to-white/95">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Mostrando <span className="font-semibold">{filteredClients.length}</span> de{' '}
                      <span className="font-semibold">{clients.length}</span> clientes
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                        Anterior
                      </button>
                      <button className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
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







