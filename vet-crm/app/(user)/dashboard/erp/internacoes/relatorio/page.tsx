'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import toast from 'react-hot-toast';

// Paleta Base44 (bege + emojis) — restyle 04/07, logica 100% preservada.
const TEAL = '#009AAC';
const NAVY = '#014D5E';
const BG = '#F6F2EA';
const SOFT = '#FBF9F4';
const TINT = '#E0F4F6';
const LINE = '#E8E2D6';
const DIV = '#F0EBE0';
const TXT = '#1F2A2E';
const TXT2 = '#5C6B70';
const TXT3 = '#8A989D';

const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14 };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '14px 24px', fontSize: 11.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.03em', color: TXT3, borderBottom: `1px solid ${LINE}` };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, color: TXT, outline: 'none' };

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

  const getStatusStyle = (status: HospitalizationStatus): React.CSSProperties => {
    const colors: Record<string, React.CSSProperties> = {
      'ADMITTED': { background: TINT, color: NAVY },
      'IN_TREATMENT': { background: '#fbf3d9', color: '#8a6d1f' },
      'STABLE': { background: '#E4F1E8', color: '#0f6e56' },
      'CRITICAL': { background: '#fdecec', color: '#a03426' },
      'DISCHARGE_PENDING': { background: '#efe6f5', color: '#6b3f8a' },
      'DISCHARGED': { background: DIV, color: TXT2 },
      'DECEASED': { background: '#e5e0d6', color: TXT2 }
    };
    return colors[status] || { background: DIV, color: TXT2 };
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

  const getPriorityStyle = (priority: Priority): React.CSSProperties => {
    const colors: Record<string, React.CSSProperties> = {
      'LOW': { background: '#E4F1E8', color: '#0f6e56' },
      'MEDIUM': { background: '#fbf3d9', color: '#8a6d1f' },
      'HIGH': { background: '#fbeee2', color: '#b45f22' },
      'CRITICAL': { background: '#fdecec', color: '#a03426' }
    };
    return colors[priority] || { background: DIV, color: TXT2 };
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: TEAL }}></div>
          <p className="mt-4" style={{ color: TXT2 }}>Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-hidden" style={{ background: BG }}>
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
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: TXT2 }}
                  >
                    <span style={{ fontSize: "20px" }}>‹</span>
                  </Link>
                  <div>
                    <h1 className="text-3xl flex items-center gap-2" style={{ color: NAVY, fontWeight: 500 }}>
                      <span style={{ fontSize: "26px" }}>📊</span>
                      Relatório de Internações
                    </h1>
                    <p className="mt-2" style={{ color: TXT2 }}>
                      Análise detalhada das internações veterinárias
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="px-6 py-3 text-sm flex items-center space-x-2 transition-all"
                    style={{ fontWeight: 500, color: TXT2, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9 }}
                  >
                    <span style={{ fontSize: "16px" }}>⬇️</span>
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl" style={{ background: '#fdecec', border: '1px solid #f3c9c4', color: '#a03426' }}>
                {error}
                <button
                  onClick={() => setError(null)}
                  className="float-right"
                  style={{ color: '#a03426' }}
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            )}

            {/* Filtros */}
            <div className="p-6 mb-6" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <span style={{fontSize:"16px"}}>🔍</span>
                <h3 className="text-lg" style={{ color: NAVY, fontWeight: 500 }}>Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: TXT2, fontWeight: 500 }}>Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: TXT2, fontWeight: 500 }}>Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: TXT2, fontWeight: 500 }}>Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={inputStyle}
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
                  <label className="block text-sm mb-2" style={{ color: TXT2, fontWeight: 500 }}>Prioridade</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    style={inputStyle}
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
                  icon: () => <span style={{fontSize:"20px"}}>🏥</span>,
                  trend: null
                },
                {
                  label: "Ativas",
                  value: stats.active,
                  icon: () => <span style={{fontSize:"20px"}}>⚡</span>,
                  trend: stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                {
                  label: "Críticas",
                  value: stats.critical,
                  icon: () => <span style={{fontSize:"20px"}}>⚠️</span>,
                  trend: stats.total > 0 ? ((stats.critical / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                {
                  label: "Altas",
                  value: stats.discharged,
                  icon: () => <span style={{fontSize:"20px"}}>✓</span>,
                  trend: stats.total > 0 ? ((stats.discharged / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                {
                  label: "Alta Pendente",
                  value: stats.dischargePending,
                  icon: () => <span style={{fontSize:"20px"}}>↗</span>,
                  trend: stats.total > 0 ? ((stats.dischargePending / stats.total) * 100).toFixed(1) + '%' : '0%'
                },
                {
                  label: "Receita Total",
                  value: formatCurrency(stats.totalRevenue),
                  icon: () => <span style={{fontSize:"20px"}}>💰</span>,
                  trend: null,
                  isFormatted: true
                },
                {
                  label: "Diária Média",
                  value: formatCurrency(stats.averageDailyRate),
                  icon: () => <span style={{fontSize:"20px"}}>📈</span>,
                  trend: null,
                  isFormatted: true
                },
                {
                  label: "Dias Média",
                  value: `${Math.round(stats.averageDaysHospitalized)} dias`,
                  icon: () => <span style={{fontSize:"20px"}}>⏱</span>,
                  trend: null
                },
                {
                  label: "Custo Médio",
                  value: formatCurrency(stats.averageCost),
                  icon: () => <span style={{fontSize:"20px"}}>💰</span>,
                  trend: null,
                  isFormatted: true
                },
                {
                  label: "Total de Dias",
                  value: `${stats.totalDays} dias`,
                  icon: () => <span style={{fontSize:"20px"}}>📅</span>,
                  trend: null
                }
              ].map((stat, index) => (
                <div key={index} className="p-6" style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12 }}>
                  <div className="flex items-center justify-between mb-4">
                    <span style={{ background: TINT, borderRadius: 10, padding: '6px 10px', display: 'inline-flex' }}>
                      <stat.icon />
                    </span>
                    {stat.trend && (
                      <div style={{ fontSize: 11, fontWeight: 500, color: TXT3 }}>
                        {stat.trend}
                      </div>
                    )}
                  </div>
                  <div style={{ color: NAVY, fontWeight: 500, fontSize: stat.isFormatted ? 20 : 26 }}>
                    {stat.value}
                  </div>
                  <div>
                    <p className="mt-2" style={{ fontSize: 11, color: TXT3, fontWeight: 500 }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela de Internações */}
            <div className="overflow-hidden" style={cardStyle}>
              <div className="px-6 py-4" style={{ background: SOFT, borderBottom: `1px solid ${LINE}` }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg flex items-center gap-2" style={{ color: NAVY, fontWeight: 500 }}>
                    <span style={{fontSize:"18px"}}>📋</span>
                    Detalhamento das Internações
                  </h3>
                  <div className="text-sm" style={{ color: TXT2 }}>
                    {hospitalizations.length} internações encontradas
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: SOFT }}>
                      <th style={thStyle}>Data Admissão</th>
                      <th style={thStyle}>Tutor/Pet</th>
                      <th style={thStyle}>Veterinário</th>
                      <th style={thStyle}>Quarto</th>
                      <th style={thStyle}>Motivo</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Prioridade</th>
                      <th style={thStyle}>Dias</th>
                      <th style={thStyle}>Diária</th>
                      <th style={thStyle}>Custo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospitalizations.map((hosp) => {
                      const days = calculateDaysHospitalized(hosp.admissionDate, hosp.actualDischargeDate);
                      return (
                        <tr
                          key={hosp.id}
                          className="transition-all duration-300"
                          style={{ borderBottom: `1px solid ${DIV}`, background: hosp.status === 'CRITICAL' ? '#fdecec55' : undefined }}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-1" style={{ color: TXT2 }}>
                              <span style={{fontSize:"14px"}}>📅</span>
                              {formatDate(hosp.admissionDate)}
                            </div>
                            {hosp.actualDischargeDate && (
                              <div className="text-xs mt-1" style={{ color: TXT3 }}>
                                Alta: {formatDate(hosp.actualDischargeDate)}
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            <div>
                              <div style={{ color: TXT, fontWeight: 500 }}>{hosp.pet.name}</div>
                              <div className="text-sm" style={{ color: TXT2 }}>{hosp.tutor.name}</div>
                              <div className="text-xs" style={{ color: TXT3 }}>{hosp.pet.species} {hosp.pet.breed && `• ${hosp.pet.breed}`}</div>
                              {hosp.tutor.phone && (
                                <div className="text-xs flex items-center gap-1 mt-1" style={{ color: TXT3 }}>
                                  <span style={{fontSize:"12px"}}>📞</span>
                                  {hosp.tutor.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-6">
                            {hosp.veterinarian ? (
                              <div className="flex items-center gap-2">
                                <span style={{fontSize:"14px"}}>🩺</span>
                                <span style={{ color: TXT2 }}>{hosp.veterinarian.name}</span>
                              </div>
                            ) : (
                              <span style={{ color: TXT3 }}>N/A</span>
                            )}
                          </td>
                          <td className="p-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs" style={{ background: DIV, color: TXT2, fontWeight: 500 }}>
                              <span style={{fontSize:"14px"}}>🏥</span>
                              <span className="ml-1">{hosp.roomNumber || 'N/A'}</span>
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="max-w-[200px] truncate" style={{ color: TXT2 }} title={hosp.reason}>
                              {hosp.reason}
                            </div>
                            {hosp.diagnosis && (
                              <div className="text-xs mt-1 truncate" style={{ color: TXT3 }} title={hosp.diagnosis}>
                                {hosp.diagnosis}
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs" style={{ ...getStatusStyle(hosp.status), fontWeight: 500 }}>
                              {getStatusLabel(hosp.status)}
                            </span>
                          </td>
                          <td className="p-6">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs" style={{ ...getPriorityStyle(hosp.priority), fontWeight: 500 }}>
                              {getPriorityLabel(hosp.priority)}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1" style={{ color: TXT2 }}>
                              <span style={{fontSize:"14px"}}>⏱</span>
                              {days} dias
                            </div>
                          </td>
                          <td className="p-6">
                            <div style={{ color: TXT, fontWeight: 500 }}>
                              {formatCurrency(hosp.dailyRate)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div style={{ color: TXT, fontWeight: 500 }}>
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
                    <span style={{fontSize:"32px"}}>🏥</span>
                    <p className="text-lg" style={{ color: TXT2 }}>Nenhuma internação encontrada</p>
                    <p className="mt-2" style={{ color: TXT3 }}>
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
