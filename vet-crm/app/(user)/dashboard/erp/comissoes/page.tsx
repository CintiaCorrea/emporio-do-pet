'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import toast, { Toaster } from 'react-hot-toast';
import { 
  LuPercent,
  LuSearch,
  LuFilter,
  LuPlus,
  LuDownload,
  LuUser,
  LuCalendar,
  LuDollarSign,
  LuTrendingUp,
  LuCircleCheck,
  LuClock,
  LuX,
  LuPencil,
  LuEye,
  LuTrash2,
  LuRefreshCw
} from 'react-icons/lu';

// Tipos para Comissões
type CommissionStatus = 'PENDING' | 'PAID' | 'CANCELLED';
type CommissionType = 'CONSULTATION' | 'SURGERY' | 'HOSPITALIZATION' | 'SERVICE' | 'PRODUCT';

interface Commission {
  id: string;
  appointmentId?: string;
  professional: {
    id: string;
    name: string;
    role: string;
    avatar?: string | null;
  };
  service: string;
  serviceType: CommissionType;
  clientName: string;
  petName: string;
  totalValue: number;
  commissionRate: number;
  commissionValue: number;
  status: CommissionStatus;
  serviceDate: string;
  paymentDate?: string;
  createdAt: string;
}

interface ApiResponse {
  commissions: Commission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ComissoesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CommissionType | 'all'>('all');
  const [professionalFilter, setProfessionalFilter] = useState<string>('all');
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState('30dias');

  useEffect(() => {
    fetchCommissions();
  }, [statusFilter, professionalFilter, dateRange]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', '1000');
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (professionalFilter !== 'all') params.append('userId', professionalFilter);
      
      // Calcular datas baseado no range
      const endDate = new Date();
      const startDate = new Date();
      if (dateRange === '7dias') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (dateRange === '30dias') {
        startDate.setDate(endDate.getDate() - 30);
      } else if (dateRange === '90dias') {
        startDate.setDate(endDate.getDate() - 90);
      } else if (dateRange === 'ano') {
        startDate.setFullYear(endDate.getFullYear(), 0, 1);
      }
      
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());

      const response = await fetch(`/api/commissions?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar comissões');
      
      const data: ApiResponse = await response.json();
      setCommissions(data.commissions || []);
    } catch (err) {
      console.error('Erro ao carregar comissões:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Profissionais únicos para o filtro
  const professionals = Array.from(new Set(commissions.map(c => c.professional.id)))
    .map(id => commissions.find(c => c.professional.id === id)?.professional)
    .filter(Boolean) as Array<{ id: string; name: string; role: string }>;

  // Filtros
  const filteredCommissions = commissions.filter(commission => {
    const matchesSearch = 
      commission.professional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.petName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || commission.status === statusFilter;
    const matchesType = typeFilter === 'all' || commission.serviceType === typeFilter;
    const matchesProfessional = professionalFilter === 'all' || commission.professional.id === professionalFilter;
    return matchesSearch && matchesStatus && matchesType && matchesProfessional;
  });

  // Estatísticas
  const stats = {
    totalCommissions: commissions.reduce((sum, c) => sum + c.commissionValue, 0),
    pendingCommissions: commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.commissionValue, 0),
    paidCommissions: commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.commissionValue, 0),
    totalServices: commissions.length,
    avgCommissionRate: commissions.length > 0 
      ? (commissions.reduce((sum, c) => sum + c.commissionRate, 0) / commissions.length).toFixed(1)
      : '0'
  };

  const getStatusColor = (status: CommissionStatus) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getStatusText = (status: CommissionStatus) => {
    switch (status) {
      case 'PAID': return 'Pago';
      case 'PENDING': return 'Pendente';
      case 'CANCELLED': return 'Cancelado';
    }
  };

  const getTypeColor = (type: CommissionType) => {
    switch (type) {
      case 'CONSULTATION': return 'bg-blue-100 text-blue-800';
      case 'SURGERY': return 'bg-red-100 text-red-800';
      case 'HOSPITALIZATION': return 'bg-purple-100 text-purple-800';
      case 'SERVICE': return 'bg-teal-100 text-teal-800';
      case 'PRODUCT': return 'bg-orange-100 text-orange-800';
    }
  };

  const getTypeText = (type: CommissionType) => {
    switch (type) {
      case 'CONSULTATION': return 'Consulta';
      case 'SURGERY': return 'Cirurgia';
      case 'HOSPITALIZATION': return 'Internação';
      case 'SERVICE': return 'Serviço';
      case 'PRODUCT': return 'Produto';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const openCommissionDetails = (commission: Commission) => {
    setSelectedCommission(commission);
    setIsModalOpen(true);
  };

  const handleMarkAsPaid = async (commission: Commission) => {
    try {
      const response = await fetch(`/api/commissions/${commission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'PAID'
        })
      });

      if (!response.ok) throw new Error('Erro ao atualizar comissão');

      toast.success('Comissão marcada como paga!');
      setIsModalOpen(false);
      fetchCommissions();
    } catch (err) {
      console.error('Erro ao marcar como pago:', err);
      toast.error('Erro ao atualizar comissão');
    }
  };

  const handleDeleteCommission = async (commission: Commission) => {
    if (!confirm('Tem certeza que deseja cancelar esta comissão?')) return;

    try {
      const response = await fetch(`/api/commissions/${commission.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Erro ao cancelar comissão');

      toast.success('Comissão cancelada com sucesso!');
      setIsModalOpen(false);
      fetchCommissions();
    } catch (err) {
      console.error('Erro ao cancelar comissão:', err);
      toast.error('Erro ao cancelar comissão');
    }
  };

  const exportToCSV = () => {
    const headers = ['Profissional', 'Serviço', 'Cliente', 'Pet', 'Valor Total', 'Taxa', 'Comissão', 'Status', 'Data'];
    const rows = filteredCommissions.map(commission => [
      commission.professional.name,
      commission.service,
      commission.clientName,
      commission.petName,
      commission.totalValue.toFixed(2),
      `${commission.commissionRate}%`,
      commission.commissionValue.toFixed(2),
      getStatusText(commission.status),
      formatDate(commission.serviceDate)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `comissoes-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Relatório exportado com sucesso!');
  };

  if (loading && commissions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando comissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <Toaster position="top-right" />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Comissões
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Gerencie as comissões dos profissionais da clínica
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <LuDownload className="w-4 h-4" />
                    <span>Exportar</span>
                  </button>
                  <button
                    onClick={fetchCommissions}
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <LuRefreshCw className="w-4 h-4" />
                    <span>Atualizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                {error}
                <button 
                  onClick={() => setError(null)}
                  className="float-right text-red-500 hover:text-red-700"
                >
                  <LuX className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gray-50">
                    <LuDollarSign className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Total Comissões</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{formatCurrency(stats.totalCommissions)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50">
                    <LuCircleCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Pagas</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{formatCurrency(stats.paidCommissions)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-50">
                    <LuClock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Pendentes</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{formatCurrency(stats.pendingCommissions)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-50">
                    <LuCalendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Total Serviços</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{stats.totalServices}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-50">
                    <LuPercent className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Taxa Média</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{stats.avgCommissionRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Busca */}
                <div className="flex-1 relative">
                  <LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar por profissional, serviço ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  />
                </div>

                {/* Filtro Profissional */}
                <div className="flex items-center gap-2">
                  <LuUser className="text-gray-400 w-5 h-5" />
                  <select
                    value={professionalFilter}
                    onChange={(e) => setProfessionalFilter(e.target.value)}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todos Profissionais</option>
                    {professionals.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Status */}
                <div className="flex items-center gap-2">
                  <LuFilter className="text-gray-400 w-5 h-5" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | 'all')}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="all">Todos Status</option>
                    <option value="PAID">Pago</option>
                    <option value="PENDING">Pendente</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>

                {/* Filtro Período */}
                <div className="flex items-center gap-2">
                  <LuCalendar className="text-gray-400 w-5 h-5" />
                  <select
                    value={dateRange}
                    onChange={(e) => {
                      setDateRange(e.target.value);
                      fetchCommissions();
                    }}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="30dias">Últimos 30 dias</option>
                    <option value="90dias">Últimos 90 dias</option>
                    <option value="ano">Este ano</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabela de Comissões */}
            {filteredCommissions.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl">
                <LuPercent className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma comissão encontrada</h3>
                <p className="text-gray-500 text-center max-w-md">
                  {searchTerm || statusFilter !== 'all' || professionalFilter !== 'all'
                    ? 'Tente ajustar os filtros para encontrar as comissões desejadas.'
                    : 'As comissões aparecerão aqui quando houver agendamentos com pagamentos.'}
                </p>
              </div>
            ) : (
              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                        <th className="text-left p-6 font-semibold text-gray-700">Profissional</th>
                        <th className="text-left p-6 font-semibold text-gray-700">Serviço</th>
                        <th className="text-left p-6 font-semibold text-gray-700">Cliente / Pet</th>
                        <th className="text-left p-6 font-semibold text-gray-700">Valor Total</th>
                        <th className="text-left p-6 font-semibold text-gray-700">Taxa</th>
                        <th className="text-left p-6 font-semibold text-gray-700">Comissão</th>
                        <th className="text-left p-6 font-semibold text-gray-700">Status</th>
                        <th className="text-left p-6 font-semibold text-gray-700">Data</th>
                        <th className="text-left p-6 font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCommissions.map((commission) => (
                        <tr 
                          key={commission.id}
                          className="border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300"
                        >
                          <td className="p-6">
                            <div>
                              <p className="font-semibold text-gray-900">{commission.professional.name}</p>
                              <p className="text-sm text-gray-500">{commission.professional.role}</p>
                            </div>
                          </td>
                          <td className="p-6">
                            <div>
                              <p className="text-gray-900">{commission.service}</p>
                              <span className={`inline-flex mt-1 px-2 py-0.5 text-xs rounded-full ${getTypeColor(commission.serviceType)}`}>
                                {getTypeText(commission.serviceType)}
                              </span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div>
                              <p className="text-gray-900">{commission.clientName}</p>
                              <p className="text-sm text-gray-500">{commission.petName}</p>
                            </div>
                          </td>
                          <td className="p-6">
                            <p className="text-gray-900 font-medium">{formatCurrency(commission.totalValue)}</p>
                          </td>
                          <td className="p-6">
                            <p className="text-blue-600 font-medium">{commission.commissionRate}%</p>
                          </td>
                          <td className="p-6">
                            <p className="text-emerald-600 font-bold">{formatCurrency(commission.commissionValue)}</p>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(commission.status)}`}>
                              {getStatusText(commission.status)}
                            </span>
                          </td>
                          <td className="p-6">
                            <p className="text-gray-600">{formatDate(commission.serviceDate)}</p>
                          </td>
                          <td className="p-6">
                            <button
                              onClick={() => openCommissionDetails(commission)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                              title="Ver detalhes"
                            >
                              <LuEye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer da tabela */}
                <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-white/20 bg-gradient-to-r from-gray-50 to-gray-100/50">
                  <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                    Mostrando {filteredCommissions.length} de {commissions.length} comissões
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedCommission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalhes da Comissão</h2>
                  <p className="text-gray-500">#{selectedCommission.id.slice(0, 8)}...</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Profissional */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <LuUser className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedCommission.professional.name}</p>
                  <p className="text-sm text-gray-500">{selectedCommission.professional.role}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`px-3 py-1.5 text-sm font-medium rounded-full border ${getStatusColor(selectedCommission.status)}`}>
                  {getStatusText(selectedCommission.status)}
                </span>
              </div>

              {/* Serviço */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Serviço</h3>
                <p className="text-gray-900">{selectedCommission.service}</p>
                <span className={`inline-flex mt-2 px-2 py-0.5 text-xs rounded-full ${getTypeColor(selectedCommission.serviceType)}`}>
                  {getTypeText(selectedCommission.serviceType)}
                </span>
              </div>

              {/* Cliente e Pet */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Cliente</h3>
                  <p className="text-gray-900">{selectedCommission.clientName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Pet</h3>
                  <p className="text-gray-900">{selectedCommission.petName}</p>
                </div>
              </div>

              {/* Valores */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do Serviço</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(selectedCommission.totalValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxa de Comissão</span>
                  <span className="text-blue-600 font-medium">{selectedCommission.commissionRate}%</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="text-gray-900 font-semibold">Valor da Comissão</span>
                  <span className="text-emerald-600 font-bold text-lg">{formatCurrency(selectedCommission.commissionValue)}</span>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Data do Serviço</h3>
                  <p className="text-gray-900">{formatDate(selectedCommission.serviceDate)}</p>
                </div>
                {selectedCommission.paymentDate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Data do Pagamento</h3>
                    <p className="text-gray-900">{formatDate(selectedCommission.paymentDate)}</p>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                {selectedCommission.status === 'PENDING' && (
                  <button
                    onClick={() => handleMarkAsPaid(selectedCommission)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-semibold transition-all"
                  >
                    <LuCircleCheck className="w-5 h-5" />
                    Marcar como Pago
                  </button>
                )}
                {selectedCommission.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleDeleteCommission(selectedCommission)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all"
                  >
                    <LuTrash2 className="w-5 h-5" />
                    Cancelar Comissão
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
