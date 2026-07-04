'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Paleta Base44 "delicada" (mesmos tokens de caixa/page.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // titulos / texto forte
const ORANGE = '#D85A30';    // coral
const GREEN = '#0f6e56';     // sucesso
const BG = '#F6F2EA';        // fundo da pagina
const SOFT = '#FBF9F4';      // areas suaves
const TINT = '#E0F4F6';      // agua
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

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

const thStyle: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '10px 12px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '13px 12px', borderBottom: `1px solid ${DIV}`, color: TXT };
const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '16px 18px' };
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff', boxSizing: 'border-box' };

export default function ComissoesPage() {
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

  const getStatusColor = (status: CommissionStatus): React.CSSProperties => {
    switch (status) {
      case 'PAID': return { background: '#e1f5ee', color: GREEN };
      case 'PENDING': return { background: '#fef0e8', color: '#993C1D' };
      case 'CANCELLED': return { background: '#fdecec', color: '#b23b2e' };
    }
  };

  const getStatusText = (status: CommissionStatus) => {
    switch (status) {
      case 'PAID': return 'Pago';
      case 'PENDING': return 'Pendente';
      case 'CANCELLED': return 'Cancelado';
    }
  };

  const getTypeColor = (type: CommissionType): React.CSSProperties => {
    switch (type) {
      case 'CONSULTATION': return { background: TINT, color: TEAL_DARK };
      case 'SURGERY': return { background: '#fdecec', color: '#b23b2e' };
      case 'HOSPITALIZATION': return { background: '#efeaf5', color: '#5b4a7a' };
      case 'SERVICE': return { background: '#e1f5ee', color: GREEN };
      case 'PRODUCT': return { background: '#fef0e8', color: '#993C1D' };
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
          'Content-Type': 'application/json'},
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

  // KPI: card branco, rotulo pequeno cinza + numero grande marinho
  const Kpi = ({ emoji, label, value }: { emoji: string; label: string; value: string }) => (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.03em', color: TXT3 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, color: TEAL_DARK, lineHeight: 1.1 }}>{value}</div>
    </div>
  );

  const btnSec: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 14px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${LINE}`, background: '#fff', color: TXT2 };

  if (loading && commissions.length === 0) {
    return (
      <div style={{ minHeight: '100%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ borderRadius: '50%', height: 44, width: 44, borderBottom: `2px solid ${TEAL}`, margin: '0 auto' }}></div>
          <p style={{ marginTop: 16, color: TXT2 }}>Carregando comissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: BG, width: '100%' }}>
      <div style={{ padding: '24px 26px 60px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 24 }}>💵</span> Comissões
                  </h1>
                  <p style={{ color: TXT2, marginTop: 6, fontSize: 13.5 }}>
                    Gerencie as comissões dos profissionais da clínica
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={exportToCSV}
                    style={btnSec}
                  >
                    <span style={{ fontSize: 14 }}>📊</span>
                    <span>Exportar</span>
                  </button>
                  <button
                    onClick={fetchCommissions}
                    style={btnSec}
                  >
                    <span style={{ fontSize: 14 }}>↻</span>
                    <span>Atualizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ marginBottom: 24, padding: 16, background: '#fdecec', border: '1px solid #f2cfca', borderRadius: 12, color: '#b23b2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b23b2e', fontSize: 14, lineHeight: 1 }}
                >
                  <span style={{ fontSize: 14 }}>✕</span>
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5" style={{ gap: 16, marginBottom: 26 }}>
              <Kpi emoji="💵" label="Total Comissões" value={formatCurrency(stats.totalCommissions)} />
              <Kpi emoji="✅" label="Pagas" value={formatCurrency(stats.paidCommissions)} />
              <Kpi emoji="⏳" label="Pendentes" value={formatCurrency(stats.pendingCommissions)} />
              <Kpi emoji="📋" label="Total Serviços" value={String(stats.totalServices)} />
              <Kpi emoji="📊" label="Taxa Média" value={`${stats.avgCommissionRate}%`} />
            </div>

            {/* Filtros */}
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                {/* Busca */}
                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: .7 }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar por profissional, serviço ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ ...inp, paddingLeft: 36 }}
                  />
                </div>

                {/* Filtro Profissional */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>👤</span>
                  <select
                    value={professionalFilter}
                    onChange={(e) => setProfessionalFilter(e.target.value)}
                    style={{ ...inp, width: 'auto' }}
                  >
                    <option value="all">Todos Profissionais</option>
                    {professionals.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>🏷️</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | 'all')}
                    style={{ ...inp, width: 'auto' }}
                  >
                    <option value="all">Todos Status</option>
                    <option value="PAID">Pago</option>
                    <option value="PENDING">Pendente</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>

                {/* Filtro Período */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>📅</span>
                  <select
                    value={dateRange}
                    onChange={(e) => {
                      setDateRange(e.target.value);
                      fetchCommissions();
                    }}
                    style={{ ...inp, width: 'auto' }}
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
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', textAlign: 'center' }}>
                <span style={{ fontSize: 34 }}>💵</span>
                <h3 style={{ fontSize: 18, fontWeight: 500, color: TEAL_DARK, margin: '14px 0 6px' }}>Nenhuma comissão encontrada</h3>
                <p style={{ color: TXT2, maxWidth: 420, fontSize: 13.5 }}>
                  {searchTerm || statusFilter !== 'all' || professionalFilter !== 'all'
                    ? 'Tente ajustar os filtros para encontrar as comissões desejadas.'
                    : 'As comissões aparecerão aqui quando houver agendamentos com pagamentos.'}
                </p>
              </div>
            ) : (
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Profissional</th>
                        <th style={thStyle}>Serviço</th>
                        <th style={thStyle}>Cliente / Pet</th>
                        <th style={thStyle}>Valor Total</th>
                        <th style={thStyle}>Taxa</th>
                        <th style={thStyle}>Comissão</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Data</th>
                        <th style={thStyle}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCommissions.map((commission) => (
                        <tr key={commission.id}>
                          <td style={tdStyle}>
                            <div>
                              <p style={{ fontWeight: 500, color: TXT, margin: 0 }}>{commission.professional.name}</p>
                              <p style={{ fontSize: 12, color: TXT3, margin: '2px 0 0' }}>{commission.professional.role}</p>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <div>
                              <p style={{ color: TXT, margin: 0 }}>{commission.service}</p>
                              <span style={{ display: 'inline-flex', marginTop: 4, padding: '3px 9px', fontSize: 11, borderRadius: 999, ...getTypeColor(commission.serviceType) }}>
                                {getTypeText(commission.serviceType)}
                              </span>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <div>
                              <p style={{ color: TXT, margin: 0 }}>{commission.clientName}</p>
                              <p style={{ fontSize: 12, color: TXT3, margin: '2px 0 0' }}>{commission.petName}</p>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <p style={{ color: TXT, fontWeight: 500, margin: 0 }}>{formatCurrency(commission.totalValue)}</p>
                          </td>
                          <td style={tdStyle}>
                            <p style={{ color: TEAL, fontWeight: 500, margin: 0 }}>{commission.commissionRate}%</p>
                          </td>
                          <td style={tdStyle}>
                            <p style={{ color: TEAL_DARK, fontWeight: 500, margin: 0 }}>{formatCurrency(commission.commissionValue)}</p>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ display: 'inline-flex', padding: '3px 10px', fontSize: 11, fontWeight: 500, borderRadius: 999, ...getStatusColor(commission.status) }}>
                              {getStatusText(commission.status)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <p style={{ color: TXT2, margin: 0 }}>{formatDate(commission.serviceDate)}</p>
                          </td>
                          <td style={tdStyle}>
                            <button
                              onClick={() => openCommissionDetails(commission)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, fontSize: 15, lineHeight: 1 }}
                              title="Ver detalhes"
                            >
                              <span>👁️</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer da tabela */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderTop: `1px solid ${LINE}`, background: SOFT }}>
                  <div style={{ fontSize: 12.5, color: TXT2 }}>
                    Mostrando {filteredCommissions.length} de {commissions.length} comissões
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedCommission && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
        >
          <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DIV}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: 0 }}>Detalhes da Comissão</h2>
                  <p style={{ color: TXT3, fontSize: 12.5, margin: '3px 0 0' }}>#{selectedCommission.id.slice(0, 8)}...</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}
                >
                  <span style={{ fontSize: 15 }}>✕</span>
                </button>
              </div>
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Profissional */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12 }}>
                <div style={{ width: 46, height: 46, background: TINT, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  <span>👤</span>
                </div>
                <div>
                  <p style={{ fontWeight: 500, color: TXT, margin: 0 }}>{selectedCommission.professional.name}</p>
                  <p style={{ fontSize: 12.5, color: TXT3, margin: '2px 0 0' }}>{selectedCommission.professional.role}</p>
                </div>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: TXT2, fontSize: 13 }}>Status</span>
                <span style={{ display: 'inline-flex', padding: '5px 12px', fontSize: 12.5, fontWeight: 500, borderRadius: 999, ...getStatusColor(selectedCommission.status) }}>
                  {getStatusText(selectedCommission.status)}
                </span>
              </div>

              {/* Serviço */}
              <div>
                <h3 style={{ fontSize: 12.5, fontWeight: 500, color: TXT3, margin: '0 0 6px' }}>Serviço</h3>
                <p style={{ color: TXT, margin: 0 }}>{selectedCommission.service}</p>
                <span style={{ display: 'inline-flex', marginTop: 8, padding: '3px 10px', fontSize: 11, borderRadius: 999, ...getTypeColor(selectedCommission.serviceType) }}>
                  {getTypeText(selectedCommission.serviceType)}
                </span>
              </div>

              {/* Cliente e Pet */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 12.5, fontWeight: 500, color: TXT3, margin: '0 0 4px' }}>Cliente</h3>
                  <p style={{ color: TXT, margin: 0 }}>{selectedCommission.clientName}</p>
                </div>
                <div>
                  <h3 style={{ fontSize: 12.5, fontWeight: 500, color: TXT3, margin: '0 0 4px' }}>Pet</h3>
                  <p style={{ color: TXT, margin: 0 }}>{selectedCommission.petName}</p>
                </div>
              </div>

              {/* Valores */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: `1px solid ${DIV}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: TXT2, fontSize: 13 }}>Valor do Serviço</span>
                  <span style={{ color: TXT, fontWeight: 500 }}>{formatCurrency(selectedCommission.totalValue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: TXT2, fontSize: 13 }}>Taxa de Comissão</span>
                  <span style={{ color: TEAL, fontWeight: 500 }}>{selectedCommission.commissionRate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${DIV}` }}>
                  <span style={{ color: TEAL_DARK, fontWeight: 500 }}>Valor da Comissão</span>
                  <span style={{ color: TEAL_DARK, fontWeight: 500, fontSize: 17 }}>{formatCurrency(selectedCommission.commissionValue)}</span>
                </div>
              </div>

              {/* Datas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 16, borderTop: `1px solid ${DIV}` }}>
                <div>
                  <h3 style={{ fontSize: 12.5, fontWeight: 500, color: TXT3, margin: '0 0 4px' }}>Data do Serviço</h3>
                  <p style={{ color: TXT, margin: 0 }}>{formatDate(selectedCommission.serviceDate)}</p>
                </div>
                {selectedCommission.paymentDate && (
                  <div>
                    <h3 style={{ fontSize: 12.5, fontWeight: 500, color: TXT3, margin: '0 0 4px' }}>Data do Pagamento</h3>
                    <p style={{ color: TXT, margin: 0 }}>{formatDate(selectedCommission.paymentDate)}</p>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: `1px solid ${DIV}` }}>
                {selectedCommission.status === 'PENDING' && (
                  <button
                    onClick={() => handleMarkAsPaid(selectedCommission)}
                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: TEAL, color: '#fff', border: 'none', borderRadius: 9, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 14 }}>✅</span>
                    Marcar como Pago
                  </button>
                )}
                {selectedCommission.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleDeleteCommission(selectedCommission)}
                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: '#fff', color: ORANGE, border: `1px solid ${ORANGE}`, borderRadius: 9, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 14 }}>🗑️</span>
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
