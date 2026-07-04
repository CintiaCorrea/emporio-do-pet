'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import toast from 'react-hot-toast';

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
      'SCHEDULED': 'bg-[#E0F4F6] text-[#014D5E]',
      'CONFIRMED': 'bg-[#E0F4F6] text-[#014D5E]',
      'IN_PROGRESS': 'bg-[#fdf6e3] text-[#854F0B]',
      'COMPLETED': 'bg-[#e1f5ee] text-[#0f6e56]',
      'CANCELED': 'bg-[#fef0e8] text-[#993C1D]',
      'NO_SHOW': 'bg-[#F0EBE0] text-[#5C6B70]'
    };
    return colors[status] || 'bg-[#F0EBE0] text-[#5C6B70]';
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
      'PAID': 'bg-[#e1f5ee] text-[#0f6e56]',
      'PENDING': 'bg-[#fdf6e3] text-[#854F0B]',
      'OVERDUE': 'bg-[#fef0e8] text-[#993C1D]',
      'CANCELLED': 'bg-[#F0EBE0] text-[#5C6B70]'
    };
    return colors[status] || 'bg-[#F0EBE0] text-[#5C6B70]';
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
      <div className="min-h-screen bg-[#F6F2EA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#009AAC] mx-auto"></div>
          <p className="mt-4 text-[#5C6B70]">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] w-full overflow-hidden">
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
                    className="p-2 bg-white border border-[#E8E2D6] hover:bg-[#FBF9F4] rounded-[9px] transition-colors text-[#014D5E]"
                  >
                    <span style={{fontSize:"16px"}}>‹</span>
                  </Link>
                  <div>
                    <h1 className="text-3xl font-medium text-[#014D5E] flex items-center gap-2">
                      <span style={{fontSize:"26px"}}>📊</span>
                      Relatório de Consultas
                    </h1>
                    <p className="text-[#5C6B70] mt-2">
                      Análise detalhada das consultas veterinárias
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="px-6 py-3 text-sm font-medium text-[#5C6B70] bg-white border border-[#E8E2D6] rounded-[9px] hover:bg-[#FBF9F4] transition-all flex items-center space-x-2"
                  >
                    <span style={{fontSize:"14px"}}>⬇️</span>
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-[#fef0e8] border border-[#E8E2D6] rounded-[13px] text-[#993C1D]">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="float-right text-[#993C1D] hover:opacity-70"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white border border-[#E8E2D6] rounded-[13px] p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span style={{fontSize:"15px"}}>🔍</span>
                <h3 className="text-lg font-medium text-[#014D5E]">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
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
                  <label className="block text-sm font-medium text-[#5C6B70] mb-2">Pagamento</label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-[#E8E2D6] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all text-[#1F2A2E]"
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
                  icon: () => <span style={{fontSize:"14px"}}>🩺</span>,
                  trend: null
                },
                { 
                  label: "Concluídas", 
                  value: stats.completed, 
                  color: "green", 
                  icon: () => <span style={{fontSize:"14px"}}>✓</span>,
                  trend: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                { 
                  label: "Canceladas", 
                  value: stats.canceled, 
                  color: "red", 
                  icon: () => null, 
                  trend: stats.total > 0 ? ((stats.canceled / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                {
                  label: "Receita Total",
                  value: formatCurrency(stats.totalRevenue),
                  color: "teal",
                  icon: () => <span style={{fontSize:"14px"}}>💰</span>,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Receita Paga", 
                  value: formatCurrency(stats.paidRevenue), 
                  color: "green", 
                  icon: () => <span style={{fontSize:"14px"}}>✓</span>,
                  trend: stats.totalRevenue > 0 ? ((stats.paidRevenue / stats.totalRevenue) * 100).toFixed(1) + '%' : '0%',
                  isFormatted: true
                },
                { 
                  label: "Receita Pendente", 
                  value: formatCurrency(stats.pendingRevenue), 
                  color: "yellow", 
                  icon: () => <span style={{fontSize:"14px"}}>⏱</span>,
                  trend: stats.totalRevenue > 0 ? ((stats.pendingRevenue / stats.totalRevenue) * 100).toFixed(1) + '%' : '0%',
                  isFormatted: true
                },
                { 
                  label: "Ticket Médio", 
                  value: formatCurrency(stats.averageValue), 
                  color: "blue", 
                  icon: () => <span style={{fontSize:"14px"}}>📈</span>,
                  trend: null,
                  isFormatted: true
                },
                { 
                  label: "Duração Média", 
                  value: `${Math.round(stats.averageDuration)} min`, 
                  color: "purple", 
                  icon: () => <span style={{fontSize:"14px"}}>⏱</span>,
                  trend: null
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white border border-[#E8E2D6] rounded-[13px] p-6 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-[#E0F4F6] rounded-[9px] flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-[#014D5E]" />
                    </div>
                    {stat.trend && (
                      <div className="text-xs font-medium text-[#8A989D]">
                        {stat.trend}
                      </div>
                    )}
                  </div>
                  <div className={`font-medium text-[#014D5E] ${stat.isFormatted ? 'text-lg' : 'text-2xl'}`}>
                    {stat.value}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#5C6B70] mt-2">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela de Consultas */}
            <div className="bg-white border border-[#E8E2D6] rounded-[13px] overflow-hidden">
              <div className="px-6 py-4 bg-[#FBF9F4] border-b border-[#E8E2D6]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#014D5E] flex items-center gap-2">
                    <span style={{fontSize:"16px"}}>📄</span>
                    Detalhamento das Consultas
                  </h3>
                  <div className="text-sm text-[#5C6B70]">
                    {consultations.length} consultas encontradas
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FBF9F4] border-b border-[#E8E2D6]">
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Data/Hora</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Tutor/Pet</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Veterinário</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Status</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Pagamento</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Valor</th>
                      <th className="text-left px-6 py-3 font-medium text-[#8A989D] uppercase text-[11.5px] tracking-wide">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((cons) => (
                      <tr
                        key={cons.id}
                        className="border-b border-[#F0EBE0] hover:bg-[#FBF9F4] transition-all"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-[#1F2A2E]">
                            <span style={{fontSize:"14px"}}>📅</span>
                            {formatDateTime(cons.date)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-[#1F2A2E]">{cons.pet.name}</div>
                            <div className="text-sm text-[#5C6B70]">{cons.tutor.name}</div>
                            <div className="text-xs text-[#8A989D]">{cons.pet.species} {cons.pet.breed && `• ${cons.pet.breed}`}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span style={{fontSize:"14px"}}>👤</span>
                            <span className="text-[#1F2A2E]">{cons.veterinarian.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cons.status)}`}>
                            {getStatusLabel(cons.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(cons.paymentStatus)}`}>
                            {getPaymentStatusLabel(cons.paymentStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-[#1F2A2E]">
                            {formatCurrency(cons.value)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-[#1F2A2E]">
                            <span style={{fontSize:"14px"}}>⏱</span>
                            {cons.duration} min
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {consultations.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <span style={{fontSize:"30px"}}>🩺</span>
                    <p className="text-[#5C6B70] text-lg">Nenhuma consulta encontrada</p>
                    <p className="text-[#8A989D] mt-2">
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


