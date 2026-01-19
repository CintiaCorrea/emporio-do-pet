// app/(user)/dashboard/erp/financeiro/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LuArrowDownRight,
  LuArrowUpRight,
  LuChartPie,
  LuDownload,
  LuFileText,
  LuFilter,
  LuLoader,
  LuPencil,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuTrendingUp,
  LuUsers,
  LuDollarSign,
} from 'react-icons/lu';
import FinanceEntryModal, { FinanceEntryFormValues } from '@/components/protected/dashboard/erp/financeiro/modals/FinanceEntryModal';
import ConfirmDeleteFinanceEntryModal from '@/components/protected/dashboard/erp/financeiro/modals/ConfirmDeleteFinanceEntryModal';

type FinanceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELED';
type FinanceType = 'INCOME' | 'EXPENSE';
type FinanceMethod = 'CASH' | 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'OTHER';

interface FinanceEntry {
  id: string;
  type: FinanceType;
  status: FinanceStatus;
  method: FinanceMethod;
  counterpartyName: string;
  service: string;
  description?: string | null;
  amountCents: number;
  date: string;
  dueDate?: string | null;
  paidAt?: string | null;
}

interface FinanceSummary {
  totalIncomeCents: number;
  paidIncomeCents: number;
  pendingIncomeCents: number;
  averageTicketCents: number;
  paidPercentage: number;
  totalCount: number;
  paidCount: number;
}

function formatCurrency(valueCents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((valueCents || 0) / 100);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR');
}

function methodLabel(m: FinanceMethod) {
  switch (m) {
    case 'PIX':
      return 'PIX';
    case 'CASH':
      return 'Dinheiro';
    case 'BOLETO':
      return 'Boleto';
    case 'CREDIT_CARD':
      return 'Cartão de Crédito';
    case 'DEBIT_CARD':
      return 'Cartão de Débito';
    case 'TRANSFER':
      return 'Transferência';
    default:
      return 'Outro';
  }
}

function getStatusColor(status: FinanceStatus) {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800';
    case 'CANCELED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusText(status: FinanceStatus) {
  switch (status) {
    case 'PAID':
      return 'Pago';
    case 'PENDING':
      return 'Pendente';
    case 'OVERDUE':
      return 'Atrasado';
    case 'CANCELED':
      return 'Cancelado';
    default:
      return status;
  }
}

function parseBrlToCents(amount: string) {
  const normalized = amount.replace(/\./g, '').replace(',', '.').trim();
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function toDateISO(yyyyMmDd: string) {
  // meio-dia pra evitar problemas de timezone em datas (yyyy-mm-dd)
  return new Date(`${yyyyMmDd}T12:00:00.000Z`).toISOString();
}

export default function FinanceiroPage() {
  const [dateRange, setDateRange] = useState<'7dias' | '30dias' | '90dias' | 'ano'>('30dias');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | FinanceStatus>('todos');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceEntry | null>(null);


  const { fromISO, toISO } = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    if (dateRange === '7dias') start.setDate(start.getDate() - 7);
    else if (dateRange === '30dias') start.setDate(start.getDate() - 30);
    else if (dateRange === '90dias') start.setDate(start.getDate() - 90);
    else start = new Date(now.getFullYear(), 0, 1);

    return { fromISO: start.toISOString(), toISO: end.toISOString() };
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (searchTerm.trim()) qs.set('search', searchTerm.trim());
      if (statusFilter !== 'todos') qs.set('status', statusFilter);
      qs.set('from', fromISO);
      qs.set('to', toISO);
      qs.set('take', '200');

      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`/api/finance/entries?${qs.toString()}`),
        fetch(`/api/finance/summary?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`),
      ]);

      if (!entriesRes.ok) {
        const err = await entriesRes.json().catch(() => null);
        throw new Error(err?.error || `Erro ao buscar lançamentos (HTTP ${entriesRes.status})`);
      }

      if (!summaryRes.ok) {
        const err = await summaryRes.json().catch(() => null);
        throw new Error(err?.error || `Erro ao buscar resumo (HTTP ${summaryRes.status})`);
      }

      const entriesData = await entriesRes.json();
      const summaryData = await summaryRes.json();

      setEntries(Array.isArray(entriesData?.items) ? entriesData.items : []);
      setSummary(summaryData ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
      setEntries([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, statusFilter]);

  const openCreate = () => {
    setEditingEntry(null);
    setIsEntryModalOpen(true);
  };

  const openEdit = (entry: FinanceEntry) => {
    setEditingEntry(entry);
    setIsEntryModalOpen(true);
  };

  const handleSubmitEntry = async (values: FinanceEntryFormValues) => {
    const payload: any = {
      type: values.type,
      status: values.status,
      method: values.method,
      counterpartyName: values.counterpartyName,
      service: values.service,
      description: values.description,
      amountCents: parseBrlToCents(values.amountBRL),
      date: toDateISO(values.date),
      dueDate: values.dueDate ? toDateISO(values.dueDate) : null,
      paidAt: values.status === 'PAID' ? toDateISO(values.date) : null,
    };

    const url = editingEntry ? `/api/finance/entries/${editingEntry.id}` : '/api/finance/entries';
    const method = editingEntry ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Erro ao salvar (HTTP ${res.status})`);
    }

    await fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/finance/entries/${deleteTarget.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Erro ao excluir (HTTP ${res.status})`);
    }
    setDeleteTarget(null);
    await fetchData();
  };

  const stats = [
    {
      label: 'Receitas (Pagas)',
      value: formatCurrency(summary?.paidIncomeCents ?? 0),
      icon: LuDollarSign,
      color: 'green' as const,
      trend: 'up' as const,
      change: `${summary?.paidCount ?? 0} pagos`,
    },
    {
      label: 'Pendentes (Receitas)',
      value: formatCurrency(summary?.pendingIncomeCents ?? 0),
      icon: LuUsers,
      color: 'yellow' as const,
      trend: 'neutral' as const,
      change: `${(summary?.totalCount ?? 0) - (summary?.paidCount ?? 0)} em aberto`,
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(summary?.averageTicketCents ?? 0),
      icon: LuTrendingUp,
      color: 'blue' as const,
      trend: 'up' as const,
      change: `${summary?.totalCount ?? 0} lançamentos`,
    },
    {
      label: 'Taxa de Pagos',
      value: `${summary?.paidPercentage ?? 0}%`,
      icon: LuChartPie,
      color: 'purple' as const,
      trend: 'up' as const,
      change: 'no período',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Financeiro
                  </h1>
                  <p className="text-gray-600 mt-2">Gerencie lançamentos e performance financeira</p>
                </div>
                <div className="flex gap-3">
                  <button className="group px-6 py-3 text-sm font-semibold text-gray-700 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2">
                    <LuDownload className="w-4 h-4" />
                    <span>Exportar</span>
                  </button>
                  <button
                    onClick={openCreate}
                    className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-2 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <LuPlus className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Novo Lançamento</span>
                  </button>
                  <button className="group px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <LuFileText className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Gerar Relatório</span>
                  </button>
                </div>
              </div>
            </div>

            <FinanceEntryModal
              isOpen={isEntryModalOpen}
              title={editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}
              initialValues={
                editingEntry
                  ? {
                      type: editingEntry.type,
                      status: editingEntry.status,
                      method: editingEntry.method,
                      counterpartyName: editingEntry.counterpartyName,
                      service: editingEntry.service,
                      description: editingEntry.description || '',
                      amountBRL: ((editingEntry.amountCents || 0) / 100).toFixed(2).replace('.', ','),
                      date: editingEntry.date.slice(0, 10),
                      dueDate: editingEntry.dueDate ? editingEntry.dueDate.slice(0, 10) : '',
                    }
                  : undefined
              }
              onClose={() => setIsEntryModalOpen(false)}
              onSubmit={handleSubmitEntry}
            />

            <ConfirmDeleteFinanceEntryModal
              isOpen={!!deleteTarget}
              title={
                deleteTarget
                  ? `Excluir lançamento de “${deleteTarget.counterpartyName}” (${deleteTarget.service})?`
                  : ''
              }
              onClose={() => setDeleteTarget(null)}
              onConfirm={handleDelete}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`p-3 rounded-xl ${
                        stat.color === 'green'
                          ? 'bg-green-50'
                          : stat.color === 'yellow'
                            ? 'bg-yellow-50'
                            : stat.color === 'blue'
                              ? 'bg-blue-50'
                              : 'bg-purple-50'
                      }`}
                    >
                      <stat.icon
                        className={`w-6 h-6 ${
                          stat.color === 'green'
                            ? 'text-green-600'
                            : stat.color === 'yellow'
                              ? 'text-yellow-600'
                              : stat.color === 'blue'
                                ? 'text-blue-600'
                                : 'text-purple-600'
                        }`}
                      />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${
                        stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-yellow-600'
                      }`}
                    >
                      {stat.trend === 'up' && <LuArrowUpRight className="w-4 h-4" />}
                      {stat.trend === 'down' && <LuArrowDownRight className="w-4 h-4" />}
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">{stat.label}</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por cliente ou serviço..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') fetchData();
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="PAID">Pagos</option>
                    <option value="PENDING">Pendentes</option>
                    <option value="OVERDUE">Atrasados</option>
                    <option value="CANCELED">Cancelados</option>
                  </select>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm flex-1 lg:flex-none"
                  >
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="30dias">Últimos 30 dias</option>
                    <option value="90dias">Últimos 90 dias</option>
                    <option value="ano">Este ano</option>
                  </select>

                  <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    <LuFilter className="w-4 h-4" />
                    <span>Aplicar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Lançamentos</h3>
                  <div className="text-sm text-gray-600">{entries.length} registros</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-white/20">
                      <th className="text-left p-6 font-semibold text-gray-700">Cliente</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Serviço</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Valor</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Data</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Vencimento</th>
                      <th className="text-left p-6 font-semibold text-gray-700">Método</th>
                      <th className="text-right p-6 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-gray-600">
                          <div className="inline-flex items-center gap-3">
                            <LuLoader className="w-5 h-5 animate-spin" />
                            <span>Carregando lançamentos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center">
                          <div className="text-red-600 font-semibold">Erro ao carregar</div>
                          <div className="text-gray-600 mt-1">{error}</div>
                          <button
                            onClick={fetchData}
                            className="mt-4 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all"
                          >
                            Tentar novamente
                          </button>
                        </td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-gray-600">
                          Nenhum lançamento encontrado para os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-white/20 hover:bg-gray-50/50 transition-all duration-300 group"
                        >
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">{entry.counterpartyName}</div>
                          </td>
                          <td className="p-6">
                            <div className="text-gray-700">{entry.service}</div>
                          </td>
                          <td className="p-6">
                            <div className="font-semibold text-gray-900">{formatCurrency(entry.amountCents)}</div>
                          </td>
                          <td className="p-6">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                entry.status,
                              )}`}
                            >
                              {getStatusText(entry.status)}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="text-gray-700">{formatDate(entry.date)}</div>
                          </td>
                          <td className="p-6">
                            <div className={`text-gray-700 ${entry.status === 'OVERDUE' ? 'text-red-600 font-semibold' : ''}`}>
                              {entry.dueDate ? formatDate(entry.dueDate) : '-'}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-gray-700">{methodLabel(entry.method)}</div>
                          </td>
                          <td className="p-6 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => openEdit(entry)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
                                title="Editar"
                              >
                                <LuPencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(entry)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-110"
                                title="Excluir"
                              >
                                <LuTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}


