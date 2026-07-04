// app/(user)/dashboard/erp/financeiro/page.tsx
// Financeiro no padrao Base44 (bege + emojis). Roupagem repaginada 04/07 — LOGICA 100% preservada.
'use client';

import { useEffect, useMemo, useState } from 'react';
import FinanceEntryModal, { FinanceEntryFormValues } from '@/components/protected/dashboard/erp/financeiro/modals/FinanceEntryModal';
import ConfirmDeleteFinanceEntryModal from '@/components/protected/dashboard/erp/financeiro/modals/ConfirmDeleteFinanceEntryModal';
import toast from 'react-hot-toast';

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // titulos / texto forte
const ORANGE = '#D85A30';    // coral / despesa
const GREEN = '#0f6e56';     // receita / sucesso
const BG = '#F6F2EA';        // fundo da pagina
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

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
    currency: 'BRL'}).format((valueCents || 0) / 100);
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

function getStatusColor(status: FinanceStatus): React.CSSProperties {
  switch (status) {
    case 'PAID':
      return { background: '#e1f5ee', color: GREEN };
    case 'PENDING':
      return { background: '#fdf6e3', color: '#854F0B' };
    case 'OVERDUE':
      return { background: '#fef0e8', color: '#993C1D' };
    case 'CANCELED':
      return { background: DIV, color: TXT2 };
    default:
      return { background: DIV, color: TXT2 };
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

const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14 };
const primaryBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, padding: '10px 16px', borderRadius: 9, cursor: 'pointer', border: 'none', background: TEAL, color: '#fff' };
const secondaryBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, padding: '10px 16px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${LINE}`, background: '#fff', color: TXT2 };
const inp: React.CSSProperties = { padding: '10px 12px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff' };
const thStyle: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '12px 16px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '14px 16px', borderBottom: `1px solid ${DIV}`, color: TXT, fontSize: 13 };

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
    try {
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
        paidAt: values.status === 'PAID' ? toDateISO(values.date) : null};

      const url = editingEntry ? `/api/finance/entries/${editingEntry.id}` : '/api/finance/entries';
      const method = editingEntry ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)});

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const message =
          (err &&
            (err.error ||
              (Array.isArray(err.message) ? err.message.join(', ') : err.message))) ||
          `Erro ao salvar (HTTP ${res.status})`;
        throw new Error(String(message));
      }

      await fetchData();
      toast.success(editingEntry ? 'Lançamento atualizado com sucesso!' : 'Lançamento criado com sucesso!');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao salvar lançamento';
      toast.error(message);
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/finance/entries/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const message =
          (err &&
            (err.error ||
              (Array.isArray(err.message) ? err.message.join(', ') : err.message))) ||
          `Erro ao excluir (HTTP ${res.status})`;
        throw new Error(String(message));
      }
      setDeleteTarget(null);
      await fetchData();
      toast.success('Lançamento excluído com sucesso!');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao excluir lançamento';
      toast.error(message);
      throw e;
    }
  };

  const stats = [
    {
      label: 'Receitas (Pagas)',
      value: formatCurrency(summary?.paidIncomeCents ?? 0),
      emoji: '💰',
      trend: 'up' as const,
      change: `${summary?.paidCount ?? 0} pagos`},
    {
      label: 'Pendentes (Receitas)',
      value: formatCurrency(summary?.pendingIncomeCents ?? 0),
      emoji: '👥',
      trend: 'neutral' as const,
      change: `${(summary?.totalCount ?? 0) - (summary?.paidCount ?? 0)} em aberto`},
    {
      label: 'Ticket Médio',
      value: formatCurrency(summary?.averageTicketCents ?? 0),
      emoji: '📈',
      trend: 'up' as const,
      change: `${summary?.totalCount ?? 0} lançamentos`},
    {
      label: 'Taxa de Pagos',
      value: `${summary?.paidPercentage ?? 0}%`,
      emoji: '🥧',
      trend: 'up' as const,
      change: 'no período'},
  ];

  return (
    <div style={{ width: '100%', minHeight: '100%', background: BG, overflow: 'hidden' }}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 500, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span>💰</span>Financeiro
                  </h1>
                  <p style={{ color: TXT2, marginTop: 6, fontSize: 13 }}>Gerencie lançamentos e performance financeira</p>
                </div>
                <div className="flex gap-3">
                  <button style={secondaryBtn}>
                    <span>📤</span>
                    <span>Exportar</span>
                  </button>
                  <button onClick={openCreate} style={primaryBtn}>
                    <span>➕</span>
                    <span>Novo Lançamento</span>
                  </button>
                  <button style={secondaryBtn}>
                    <span>📊</span>
                    <span>Gerar Relatório</span>
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
                      dueDate: editingEntry.dueDate ? editingEntry.dueDate.slice(0, 10) : ''}
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
                  style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '16px 18px' }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{stat.emoji}</span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: stat.trend === 'up' ? GREEN : stat.trend === 'down' ? ORANGE : TXT3}}
                    >
                      {stat.trend === 'up' && <span>↗</span>}
                      {stat.trend === 'down' && <span>↘</span>}
                      <span>{stat.change}</span>
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.03em', color: TXT3, fontWeight: 500, marginBottom: 6 }}>{stat.label}</p>
                    <p style={{ fontSize: 26, fontWeight: 500, color: TEAL_DARK }}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, padding: 18, marginBottom: 18 }}>
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span style={{ fontSize: 15 }}>🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por cliente ou serviço..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') fetchData();
                      }}
                      className="w-full"
                      style={{ ...inp, paddingLeft: 38 }}
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    style={inp}
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
                    className="flex-1 lg:flex-none"
                    style={inp}
                  >
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="30dias">Últimos 30 dias</option>
                    <option value="90dias">Últimos 90 dias</option>
                    <option value="ano">Este ano</option>
                  </select>

                  <button onClick={fetchData} style={secondaryBtn}>
                    <span>🔍</span>
                    <span>Aplicar</span>
                  </button>
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: '16px 18px', background: '#FBF9F4', borderBottom: `1px solid ${LINE}` }}>
                <div className="flex items-center justify-between">
                  <h3 style={{ fontSize: 15, fontWeight: 500, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📋</span>Lançamentos
                  </h3>
                  <div style={{ fontSize: 12.5, color: TXT2 }}>{entries.length} registros</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Cliente</th>
                      <th style={thStyle}>Serviço</th>
                      <th style={thStyle}>Valor</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Data</th>
                      <th style={thStyle}>Vencimento</th>
                      <th style={thStyle}>Método</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: TXT2, padding: 40 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                            <span>⏳</span>
                            <span>Carregando lançamentos...</span>
                          </span>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: 40 }}>
                          <div style={{ color: ORANGE, fontWeight: 500 }}>Erro ao carregar</div>
                          <div style={{ color: TXT2, marginTop: 4 }}>{error}</div>
                          <button
                            onClick={fetchData}
                            style={{ ...primaryBtn, marginTop: 16 }}
                          >
                            Tentar novamente
                          </button>
                        </td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: TXT3, padding: 40 }}>
                          Nenhum lançamento encontrado para os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 500, color: TEAL_DARK }}>{entry.counterpartyName}</div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ color: TXT2 }}>{entry.service}</div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 500, color: entry.type === 'INCOME' ? GREEN : ORANGE }}>{formatCurrency(entry.amountCents)}</div>
                          </td>
                          <td style={tdStyle}>
                            <span
                              style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, ...getStatusColor(entry.status) }}
                            >
                              {getStatusText(entry.status)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ color: TXT2 }}>{formatDate(entry.date)}</div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ color: entry.status === 'OVERDUE' ? ORANGE : TXT2, fontWeight: entry.status === 'OVERDUE' ? 500 : 400 }}>
                              {entry.dueDate ? formatDate(entry.dueDate) : '-'}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ color: TXT2 }}>{methodLabel(entry.method)}</div>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <button
                                onClick={() => openEdit(entry)}
                                title="Editar"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, fontSize: 15, lineHeight: 1 }}
                              >
                                <span>✏️</span>
                              </button>
                              <button
                                onClick={() => setDeleteTarget(entry)}
                                title="Excluir"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, fontSize: 15, lineHeight: 1 }}
                              >
                                <span>🗑️</span>
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
