'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LuUsers, LuSearch, LuLoader, LuRefreshCw,
  LuDollarSign, LuTrendingUp, LuArrowRightLeft,
  LuTag, LuEye, LuPenLine, LuFilter, LuX, LuShoppingCart
} from 'react-icons/lu';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CHURNED';
  type: 'INDIVIDUAL' | 'COMPANY';
  companyName: string | null;
  taxId: string | null;
  tags: string[];
  convertedFromLeadId: string | null;
  totalRevenue: number;
  totalOrders: number;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClientStats {
  total: number;
  active: number;
  fromLeads: number;
  totalRevenue: number;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  SUSPENDED: 'Suspenso',
  CHURNED: 'Perdido',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  CHURNED: 'bg-red-100 text-red-700',
};

export default function CrmClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromLeadFilter, setFromLeadFilter] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<string | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (fromLeadFilter) params.set('fromLead', 'true');
      const response = await fetch(`/api/clients?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar clientes');
      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, fromLeadFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/clients/stats');
      if (response.ok) setStats(await response.json());
    } catch { /* optional */ }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRecordPurchase = async () => {
    if (!purchaseModal || !purchaseAmount) return;
    try {
      setSaving(true);
      const amountCents = Math.round(parseFloat(purchaseAmount) * 100);
      const response = await fetch(`/api/clients/${purchaseModal}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents }),
      });
      if (!response.ok) throw new Error('Erro ao registrar');
      toast.success('Compra registrada!');
      setPurchaseModal(null);
      setPurchaseAmount('');
      fetchClients();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (cents: number) =>
    `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Clientes CRM
            </h1>
            <p className="text-gray-500 mt-1">Clientes e conversões do CRM</p>
          </div>
          <button onClick={() => { fetchClients(); fetchStats(); }} className="p-2 rounded-xl bg-white/80 border border-gray-200/80 hover:bg-white transition-all">
            <LuRefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl"><LuUsers className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-xl"><LuTrendingUp className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Ativos</p>
                  <p className="text-xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl"><LuArrowRightLeft className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">De Leads</p>
                  <p className="text-xl font-bold text-gray-900">{stats.fromLeads}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl"><LuDollarSign className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Receita Total</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              onClick={() => setFromLeadFilter(!fromLeadFilter)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${fromLeadFilter ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white/80 border-gray-200/80 text-gray-600'}`}
            >
              <LuArrowRightLeft className="w-4 h-4" />
              De Leads
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LuLoader className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500">Carregando clientes...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-red-600 font-semibold">Erro ao carregar</div>
              <div className="text-gray-500 mt-1">{error}</div>
              <button onClick={fetchClients} className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl">Tentar novamente</button>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-20">
              <LuUsers className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-semibold text-gray-600">Nenhum cliente encontrado</p>
              <p className="text-gray-400 mt-1">Converta leads para adicionar clientes ao CRM</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Receita</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Pedidos</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">De Lead</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-5">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.email}</p>
                        {client.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
                      </td>
                      <td className="py-3 px-5">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {client.type === 'COMPANY' ? 'Empresa' : 'Individual'}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[client.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[client.status] || client.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-medium text-gray-900">
                        {formatCurrency(client.totalRevenue)}
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-600">{client.totalOrders}</td>
                      <td className="py-3 px-5">
                        {client.convertedFromLeadId ? (
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Sim</span>
                        ) : (
                          <span className="text-xs text-gray-400">Não</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/crm/clientes/${client.id}`} className="p-2 rounded-xl hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-all" title="Ver detalhes">
                            <LuEye className="w-4 h-4" />
                          </Link>
                          <button onClick={() => setPurchaseModal(client.id)} className="p-2 rounded-xl hover:bg-green-100 text-gray-400 hover:text-green-600 transition-all" title="Registrar compra">
                            <LuShoppingCart className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {purchaseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPurchaseModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Registrar Compra</h3>
            <p className="text-gray-600 mt-1 text-sm">Insira o valor da compra em reais</p>
            <div className="mt-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setPurchaseModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                Cancelar
              </button>
              <button
                onClick={handleRecordPurchase}
                disabled={saving || !purchaseAmount}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {saving ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuShoppingCart className="w-4 h-4" />}
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
