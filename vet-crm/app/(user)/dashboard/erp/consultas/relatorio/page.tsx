'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { 
  LuArrowLeft,
  LuStethoscope,
  LuCalendar,
  LuClock,
  LuDollarSign,
  LuTrendingUp,
  LuTrendingDown,
  LuCircleCheck,
  LuX,
  LuActivity,
  LuUser,
  LuPawPrint,
  LuDownload,
  LuFilter,
  LuBarChart3,
  LuPieChart,
  LuFileText
} from 'react-icons/lu';
import toast, { Toaster } from 'react-hot-toast';

// Tipos
interface Consultation {
  id: string;
  tutor: {
    id: string;
    name: string;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
  };
  veterinarian: {
    id: string;
    name: string;
  };
  date: string;
  duration: number;
  status: string;
  value: number;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  createdAt: string;
}

interface Appointment {
  id: string;
  tutorId: string;
  petId: string;
  userId: string;
  date: string;
  duration: number;
  description?: string;
  notes?: string;
  value: number;
  status: string;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  tutor: {
    id: string;
    name: string;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  appointments: Appointment[];
  totals: {
    value: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Função para converter Appointment para Consultation
const appointmentToConsultation = (appointment: Appointment): Consultation => {
  const date = new Date(appointment.date);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  return {
    id: appointment.id,
    tutor: appointment.tutor,
    pet: appointment.pet,
    veterinarian: appointment.user || { id: appointment.userId, name: 'Não informado' },
    date: appointment.date,
    duration: appointment.duration,
    status: appointment.status,
    value: appointment.value,
    paymentStatus: appointment.paymentStatus,
    createdAt: appointment.createdAt
  };
};

export default function ConsultationsReportPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    canceled: 0,
    scheduled: 0,
    inProgress: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    averageValue: 0,
    totalDuration: 0,
    averageDuration: 0
  });

  useEffect(() => {
    fetchConsultations();
  }, [startDate, endDate, statusFilter, paymentFilter]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', '1000'); // Buscar muitas consultas para o relatório
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);

      const response = await fetch(`/api/appointments?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar consultas');

      const data: ApiResponse = await response.json();
      const consultationsData = data.appointments.map(appointmentToConsultation);
      setConsultations(consultationsData);

      // Calcular estatísticas
      calculateStats(consultationsData);
    } catch (err) {
      console.error('Erro ao carregar consultas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar consultas');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Consultation[]) => {
    const total = data.length;
    const completed = data.filter(c => c.status === 'COMPLETED').length;
    const canceled = data.filter(c => c.status === 'CANCELED').length;
    const scheduled = data.filter(c => c.status === 'SCHEDULED' || c.status === 'CONFIRMED').length;
    const inProgress = data.filter(c => c.status === 'IN_PROGRESS').length;
    
    const totalRevenue = data.reduce((acc, c) => acc + c.value, 0);
    const paidRevenue = data
      .filter(c => c.paymentStatus === 'PAID')
      .reduce((acc, c) => acc + c.value, 0);
    const pendingRevenue = data
      .filter(c => c.paymentStatus === 'PENDING' || c.paymentStatus === 'OVERDUE')
      .reduce((acc, c) => acc + c.value, 0);
    
    const averageValue = total > 0 ? totalRevenue / total : 0;
    const totalDuration = data.reduce((acc, c) => acc + c.duration, 0);
    const averageDuration = total > 0 ? totalDuration / total : 0;

    setStats({
      total,
      completed,
      canceled,
      scheduled,
      inProgress,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      averageValue,
      totalDuration,
      averageDuration
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'SCHEDULED': 'Agendada',
      'CONFIRMED': 'Confirmada',
      'IN_PROGRESS': 'Em Andamento',
      'COMPLETED': 'Concluída',
      'CANCELED': 'Cancelada',
      'NO_SHOW': 'Não Compareceu'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'SCHEDULED': 'bg-purple-100 text-purple-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELED': 'bg-red-100 text-red-800',
      'NO_SHOW': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PAID': 'Pago',
      'PENDING': 'Pendente',
      'OVERDUE': 'Atrasado',
      'CANCELLED': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PAID': 'bg-green-100 text-green-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'OVERDUE': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Hora', 'Tutor', 'Pet', 'Veterinário', 'Status', 'Pagamento', 'Valor', 'Duração (min)'];
    const rows = consultations.map(c => {
      const date = new Date(c.date);
      return [
        formatDate(c.date),
        date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        c.tutor.name,
        c.pet.name,
        c.veterinarian.name,
        getStatusLabel(c.status),
        getPaymentStatusLabel(c.paymentStatus),
        c.value.toFixed(2),
        c.duration.toString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-consultas-${startDate}-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Relatório exportado com sucesso!');
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <Toaster position="top-right" />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content */}
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard/erp/consultas"
                    className="p-2 hover:bg-white/80 rounded-xl transition-colors"
                  >
                    <LuArrowLeft className="w-5 h-5 text-gray-600" />
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Relatório de Consultas
                    </h1>
                    <p className="text-gray-600 mt-2">
                      Análise detalhada das consultas veterinárias
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                  >
                    <LuDownload className="w-4 h-4" />
                    <span>Exportar CSV</span>
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

            {/* Filtros */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-teal-500/5 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <LuFilter className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="all">Todos</option>
                    <option value="SCHEDULED">Agendadas</option>
                    <option value="CONFIRMED">Confirmadas</option>
                    <option value="IN_PROGRESS">Em Andamento</option>
                    <option value="COMPLETED">Concluídas</option>
                    <option value="CANCELED">Canceladas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pagamento</label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="all">Todos</option>
                    <option value="PAID">Pago</option>
                    <option value="PENDING">Pendente</option>
                    <option value="OVERDUE">Atrasado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { 
                  label: "Total de Consultas", 
                  value: stats.total, 
                  color: "gray", 
                  icon: LuStethoscope,
                  trend: null
                },
                { 
                  label: "Concluídas", 
                  value: stats.completed, 
                  color: "green", 
                  icon: LuCircleCheck,
                  trend: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Canceladas", 
                  value: stats.canceled, 
                  color: "red", 
                  icon: LuX,
                  trend: stats.total > 0 ? ((stats.canceled / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Receita Total", 
                  value: formatCurrency(stats.totalRevenue), 
                  color: "teal", 
                  icon: LuDollarSign,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Receita Paga", 
                  value: formatCurrency(stats.paidRevenue), 
                  color: "green", 
                  icon: LuCircleCheck,
                  trend: stats.totalRevenue > 0 ? ((stats.paidRevenue / stats.totalRevenue) * 100).toFixed(1) + '%' : '0%',
                  isFormatted: true
                },
                { 
                  label: "Receita Pendente", 
                  value: formatCurrency(stats.pendingRevenue), 
                  color: "yellow", 
                  icon: LuClock,
                  trend: stats.totalRevenue > 0 ? ((stats.pendingRevenue / stats.totalRevenue) * 100).toFixed(1) + '%' : '0%',
                  isFormatted: true
                },
                { 
                  label: "Ticket Médio", 
                  value: formatCurrency(stats.averageValue), 
                  color: "blue", 
                  icon: LuTrendingUp,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Duração Média", 
                  value: `${Math.round(stats.averageDuration)} min`, 
                  color: "purple", 
                  icon: LuClock,
                  trend: null
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-teal-500/5 p-6 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                    {stat.trend && (
                      <div className="text-xs font-semibold text-gray-500">
                        {stat.trend}
                      </div>
                    )}
                  </div>
                  <div className={`font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent ${stat.isFormatted ? 'text-lg' : 'text-2xl'}`}>
                    {stat.value}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mt-2">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela de Consultas */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-teal-500/5 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <LuFileText className="w-5 h-5" />
                    Detalhamento das Consultas
                  </h3>
                  <div className="text-sm text-gray-600">
                    {consultations.length} consultas encontradas
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Data/Hora</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Tutor/Pet</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Veterinário</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Pagamento</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Valor</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((cons) => (
                      <tr 
                        key={cons.id} 
                        className="border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300"
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-1 text-gray-700">
                            <LuCalendar className="w-4 h-4" />
                            {formatDateTime(cons.date)}
                          </div>
                        </td>
                        <td className="p-6">
                          <div>
                            <div className="font-semibold text-gray-900">{cons.pet.name}</div>
                            <div className="text-sm text-gray-500">{cons.tutor.name}</div>
                            <div className="text-xs text-gray-400">{cons.pet.species} {cons.pet.breed && `• ${cons.pet.breed}`}</div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <LuUser className="w-4 h-4 text-teal-600" />
                            <span className="text-gray-700">{cons.veterinarian.name}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cons.status)}`}>
                            {getStatusLabel(cons.status)}
                          </span>
                        </td>
                        <td className="p-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(cons.paymentStatus)}`}>
                            {getPaymentStatusLabel(cons.paymentStatus)}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(cons.value)}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-1 text-gray-700">
                            <LuClock className="w-4 h-4" />
                            {cons.duration} min
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {consultations.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <LuStethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nenhuma consulta encontrada</p>
                    <p className="text-gray-400 mt-2">
                      Tente ajustar os filtros de busca
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


