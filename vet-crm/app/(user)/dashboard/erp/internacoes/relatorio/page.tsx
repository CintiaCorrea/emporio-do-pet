'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { 
  LuArrowLeft,
  LuBedDouble,
  LuCalendar,
  LuClock,
  LuDollarSign,
  LuTrendingUp,
  LuCircleCheck,
  LuActivity,
  LuUser,
  LuPawPrint,
  LuDownload,
  LuFilter,
  LuFileText,
  LuTriangleAlert,
  LuArrowUpRight,
  LuStethoscope,
  LuPhone
} from 'react-icons/lu';
import toast from 'react-hot-toast';

// Tipos
type HospitalizationStatus = 'ADMITTED' | 'IN_TREATMENT' | 'STABLE' | 'CRITICAL' | 'DISCHARGE_PENDING' | 'DISCHARGED' | 'DECEASED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface Hospitalization {
  id: string;
  tutor: {
    id: string;
    name: string;
    phone?: string;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    age?: string;
  };
  veterinarian?: {
    id: string;
    name: string;
  };
  admissionDate: string;
  estimatedDischargeDate?: string;
  actualDischargeDate?: string;
  reason: string;
  diagnosis?: string;
  notes?: string;
  roomNumber?: string;
  dailyRate: number;
  totalCost: number;
  status: HospitalizationStatus;
  priority: Priority;
  vitalSigns?: {
    temperature?: number;
    heartRate?: number;
    weight?: number;
  };
  treatments: Array<{
    id: string;
    description: string;
    date: string;
    cost: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  hospitalizations: Hospitalization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function HospitalizationsReportPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hospitalizations, setHospitalizations] = useState<Hospitalization[]>([]);
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
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    critical: 0,
    discharged: 0,
    dischargePending: 0,
    totalRevenue: 0,
    averageDailyRate: 0,
    averageDaysHospitalized: 0,
    totalDays: 0,
    averageCost: 0
  });

  useEffect(() => {
    fetchHospitalizations();
  }, [startDate, endDate, statusFilter, priorityFilter]);

  const fetchHospitalizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', '1000'); // Buscar muitas internações para o relatório
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await fetch(`/api/hospitalizations?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar internações');

      const data: ApiResponse = await response.json();
      let hospitalizationsData = data.hospitalizations || [];

      // Filtrar por data (se necessário)
      if (startDate || endDate) {
        hospitalizationsData = hospitalizationsData.filter(hosp => {
          const admissionDate = new Date(hosp.admissionDate);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          
          if (start && admissionDate < start) return false;
          if (end && admissionDate > end) return false;
          return true;
        });
      }

      setHospitalizations(hospitalizationsData);
      calculateStats(hospitalizationsData);
    } catch (err) {
      console.error('Erro ao carregar internações:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar internações');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Hospitalization[]) => {
    const total = data.length;
    const active = data.filter(h => !['DISCHARGED', 'DECEASED'].includes(h.status)).length;
    const critical = data.filter(h => h.status === 'CRITICAL' || h.priority === 'CRITICAL').length;
    const discharged = data.filter(h => h.status === 'DISCHARGED').length;
    const dischargePending = data.filter(h => h.status === 'DISCHARGE_PENDING').length;
    
    const totalRevenue = data.reduce((acc, h) => acc + h.totalCost, 0);
    const averageDailyRate = total > 0 
      ? data.reduce((acc, h) => acc + h.dailyRate, 0) / total 
      : 0;
    
    // Calcular dias internados
    const totalDays = data.reduce((acc, h) => {
      const admission = new Date(h.admissionDate);
      const discharge = h.actualDischargeDate ? new Date(h.actualDischargeDate) : new Date();
      const diffTime = Math.abs(discharge.getTime() - admission.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return acc + diffDays;
    }, 0);
    
    const averageDaysHospitalized = total > 0 ? totalDays / total : 0;
    const averageCost = total > 0 ? totalRevenue / total : 0;

    setStats({
      total,
      active,
      critical,
      discharged,
      dischargePending,
      totalRevenue,
      averageDailyRate,
      averageDaysHospitalized,
      totalDays,
      averageCost
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

  const calculateDaysHospitalized = (admissionDate: string, dischargeDate?: string) => {
    const admission = new Date(admissionDate);
    const discharge = dischargeDate ? new Date(dischargeDate) : new Date();
    const diffTime = Math.abs(discharge.getTime() - admission.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusLabel = (status: HospitalizationStatus) => {
    const labels: Record<string, string> = {
      'ADMITTED': 'Admitido',
      'IN_TREATMENT': 'Em Tratamento',
      'STABLE': 'Estável',
      'CRITICAL': 'Crítico',
      'DISCHARGE_PENDING': 'Alta Pendente',
      'DISCHARGED': 'Alta',
      'DECEASED': 'Óbito'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: HospitalizationStatus) => {
    const colors: Record<string, string> = {
      'ADMITTED': 'bg-blue-100 text-blue-800',
      'IN_TREATMENT': 'bg-yellow-100 text-yellow-800',
      'STABLE': 'bg-green-100 text-green-800',
      'CRITICAL': 'bg-red-100 text-red-800',
      'DISCHARGE_PENDING': 'bg-purple-100 text-purple-800',
      'DISCHARGED': 'bg-gray-100 text-gray-800',
      'DECEASED': 'bg-gray-300 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityLabel = (priority: Priority) => {
    const labels: Record<string, string> = {
      'LOW': 'Baixa',
      'MEDIUM': 'Média',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica'
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: Priority) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-green-100 text-green-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'CRITICAL': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    const headers = ['Data Admissão', 'Data Alta', 'Tutor', 'Pet', 'Veterinário', 'Quarto', 'Motivo', 'Status', 'Prioridade', 'Diária', 'Dias Internado', 'Custo Total'];
    const rows = hospitalizations.map(h => {
      const days = calculateDaysHospitalized(h.admissionDate, h.actualDischargeDate);
      return [
        formatDate(h.admissionDate),
        h.actualDischargeDate ? formatDate(h.actualDischargeDate) : 'Em andamento',
        h.tutor.name,
        h.pet.name,
        h.veterinarian?.name || 'N/A',
        h.roomNumber || 'N/A',
        h.reason,
        getStatusLabel(h.status),
        getPriorityLabel(h.priority),
        h.dailyRate.toFixed(2),
        days.toString(),
        h.totalCost.toFixed(2)
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
    link.setAttribute('download', `relatorio-internacoes-${startDate}-${endDate}.csv`);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
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
                    href="/dashboard/erp/internacoes"
                    className="p-2 hover:bg-white/80 rounded-xl transition-colors"
                  >
                    <LuArrowLeft className="w-5 h-5 text-gray-600" />
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Relatório de Internações
                    </h1>
                    <p className="text-gray-600 mt-2">
                      Análise detalhada das internações veterinárias
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
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-red-500/5 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <LuFilter className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="all">Todos</option>
                    <option value="ADMITTED">Admitido</option>
                    <option value="IN_TREATMENT">Em Tratamento</option>
                    <option value="STABLE">Estável</option>
                    <option value="CRITICAL">Crítico</option>
                    <option value="DISCHARGE_PENDING">Alta Pendente</option>
                    <option value="DISCHARGED">Alta</option>
                    <option value="DECEASED">Óbito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-gray-900"
                  >
                    <option value="all">Todas</option>
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { 
                  label: "Total de Internações", 
                  value: stats.total, 
                  color: "gray", 
                  icon: LuBedDouble,
                  trend: null
                },
                { 
                  label: "Ativas", 
                  value: stats.active, 
                  color: "blue", 
                  icon: LuActivity,
                  trend: stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Críticas", 
                  value: stats.critical, 
                  color: "red", 
                  icon: LuTriangleAlert,
                  trend: stats.total > 0 ? ((stats.critical / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Altas", 
                  value: stats.discharged, 
                  color: "green", 
                  icon: LuCircleCheck,
                  trend: stats.total > 0 ? ((stats.discharged / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Alta Pendente", 
                  value: stats.dischargePending, 
                  color: "purple", 
                  icon: LuArrowUpRight,
                  trend: stats.total > 0 ? ((stats.dischargePending / stats.total) * 100).toFixed(1) + '%' : '0%'
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
                  label: "Diária Média", 
                  value: formatCurrency(stats.averageDailyRate), 
                  color: "blue", 
                  icon: LuTrendingUp,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Dias Média", 
                  value: `${Math.round(stats.averageDaysHospitalized)} dias`, 
                  color: "purple", 
                  icon: LuClock,
                  trend: null
                },
                { 
                  label: "Custo Médio", 
                  value: formatCurrency(stats.averageCost), 
                  color: "orange", 
                  icon: LuDollarSign,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Total de Dias", 
                  value: `${stats.totalDays} dias`, 
                  color: "indigo", 
                  icon: LuCalendar,
                  trend: null
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-red-500/5 p-6 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 hover:scale-105">
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

            {/* Tabela de Internações */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-red-500/5 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <LuFileText className="w-5 h-5" />
                    Detalhamento das Internações
                  </h3>
                  <div className="text-sm text-gray-600">
                    {hospitalizations.length} internações encontradas
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Data Admissão</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Tutor/Pet</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Veterinário</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Quarto</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Motivo</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Prioridade</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Dias</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Diária</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Custo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospitalizations.map((hosp) => {
                      const days = calculateDaysHospitalized(hosp.admissionDate, hosp.actualDischargeDate);
                      return (
                        <tr 
                          key={hosp.id} 
                          className={`border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 ${
                            hosp.status === 'CRITICAL' ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-1 text-gray-700">
                              <LuCalendar className="w-4 h-4" />
                              {formatDate(hosp.admissionDate)}
                            </div>
                            {hosp.actualDischargeDate && (
                              <div className="text-xs text-gray-500 mt-1">
                                Alta: {formatDate(hosp.actualDischargeDate)}
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            <div>
                              <div className="font-semibold text-gray-900">{hosp.pet.name}</div>
                              <div className="text-sm text-gray-500">{hosp.tutor.name}</div>
                              <div className="text-xs text-gray-400">{hosp.pet.species} {hosp.pet.breed && `• ${hosp.pet.breed}`}</div>
                              {hosp.tutor.phone && (
                                <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                  <LuPhone className="w-3 h-3" />
                                  {hosp.tutor.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-6">
                            {hosp.veterinarian ? (
                              <div className="flex items-center gap-2">
                                <LuStethoscope className="w-4 h-4 text-red-600" />
                                <span className="text-gray-700">{hosp.veterinarian.name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="p-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <LuBedDouble className="w-3 h-3 mr-1" />
                              {hosp.roomNumber || 'N/A'}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="text-gray-700 max-w-[200px] truncate" title={hosp.reason}>
                              {hosp.reason}
                            </div>
                            {hosp.diagnosis && (
                              <div className="text-xs text-gray-500 mt-1 truncate" title={hosp.diagnosis}>
                                {hosp.diagnosis}
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(hosp.status)}`}>
                              {getStatusLabel(hosp.status)}
                            </span>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(hosp.priority)}`}>
                              {getPriorityLabel(hosp.priority)}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1 text-gray-700">
                              <LuClock className="w-4 h-4" />
                              {days} dias
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(hosp.dailyRate)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(hosp.totalCost)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {hospitalizations.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <LuBedDouble className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nenhuma internação encontrada</p>
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


