'use client';

// ⚠️  REFACTOR EM PROGRESSO:
// Cliente unificado no Tutor (Tutor.classificacao = 'Cliente') em a672640.
// URL /api/clients/* mantida temporariamente como compat layer apontando pra /tutors no backend.
// Alguns campos podem não bater 100% com o backend até validação contra dados reais.


import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LuArrowLeft, LuLoader, LuUser,
  LuPhone, LuCalendar,
  LuDollarSign, LuCheck, LuPlus, LuTrash} from 'react-icons/lu';
import toast from 'react-hot-toast';

interface Tutor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CHURNED';
  type: 'INDIVIDUAL' | 'COMPANY';
  companyName: string | null;
  cnpj: string | null;
  website: string | null;
  observations: string | null;
  tags: string[];
  convertedFromLeadId: string | null;
  totalRevenue: number;
  totalOrders: number;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  SUSPENDED: 'Suspenso',
  CHURNED: 'Perdido'};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  INACTIVE: 'bg-gray-100 text-gray-700 border-gray-200',
  SUSPENDED: 'bg-orange-100 text-orange-700 border-orange-200',
  CHURNED: 'bg-red-100 text-red-700 border-red-200'};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  const [tagModal, setTagModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  const [purchaseModal, setPurchaseModal] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');

  const [saving, setSaving] = useState(false);

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/clients/${id}`);
      if (!response.ok) throw new Error('Cliente não encontrado');
      const data = await response.json();
      setClient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus })});
      if (!response.ok) throw new Error('Erro ao atualizar status');
      toast.success('Status atualizado!');
      setStatusModal(false);
      fetchClient();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      setSaving(true);
      const currentTags = client?.tags || [];
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [...new Set([...currentTags, newTag.trim()])] })});
      if (!response.ok) throw new Error('Erro ao adicionar tag');
      toast.success('Tag adicionada!');
      setNewTag('');
      setTagModal(false);
      fetchClient();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      const currentTags = client?.tags || [];
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: currentTags.filter(t => t !== tag) })});
      if (!response.ok) throw new Error('Erro ao remover tag');
      toast.success('Tag removida!');
      fetchClient();
    } catch {
      toast.error('Erro ao remover tag');
    }
  };

  const handleRecordPurchase = async () => {
    if (!purchaseAmount) return;
    try {
      setSaving(true);
      const amountCents = Math.round(parseFloat(purchaseAmount) * 100);
      const response = await fetch(`/api/clients/${id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents })});
      if (!response.ok) throw new Error('Erro ao registrar compra');
      toast.success('Compra registrada!');
      setPurchaseModal(false);
      setPurchaseAmount('');
      fetchClient();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (cents: number) =>
    `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <LuLoader className="w-6 h-6 animate-spin" />
          <span className="text-lg">Carregando cliente...</span>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 font-semibold text-lg">{error || 'Cliente não encontrado'}</div>
          <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-gray-200 rounded-2xl hover:bg-gray-300 transition-all">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/80 border border-gray-200/80 hover:bg-white transition-all">
            <LuArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-sm text-gray-500">{client.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${STATUS_COLORS[client.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
              {STATUS_LABELS[client.status] || client.status}
            </span>
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {client.type === 'COMPANY' ? 'Empresa' : 'Individual'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchClient} className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white transition-all text-sm">
            <span style={{fontSize:"14px"}}>↻</span> Atualizar
          </button>
          <button onClick={() => { setSelectedStatus(client.status); setStatusModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-2xl hover:bg-orange-100 transition-all text-sm text-orange-700">
            <span style={{fontSize:"14px"}}>✏</span> Alterar Status
          </button>
          <button onClick={() => setTagModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-2xl hover:bg-purple-100 transition-all text-sm text-purple-700">
            <span style={{fontSize:"14px"}}>🏷</span> Adicionar Tag
          </button>
          <button onClick={() => setPurchaseModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-2xl hover:scale-105 transition-all text-sm shadow-lg shadow-green-500/25">
            <span style={{fontSize:"14px"}}>🛒</span> Registrar Compra
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-100 rounded-xl"><LuDollarSign className="w-6 h-6 text-cyan-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(client.totalRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl"><span style={{fontSize:"14px"}}>🛒</span></div>
              <div>
                <p className="text-xs text-gray-500">Total de Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{client.totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl"><LuCalendar className="w-6 h-6 text-purple-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Último Pedido</p>
                <p className="text-2xl font-bold text-gray-900">
                  {client.lastOrderAt ? new Date(client.lastOrderAt).toLocaleDateString('pt-BR') : 'Nenhum'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info + Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Informações</h3>
            <div className="space-y-3">
              <InfoRow icon={<LuUser className="w-4 h-4" />} label="Nome" value={client.name} />
              <InfoRow icon={<span style={{fontSize:"14px"}}>✉</span>} label="Email" value={client.email} />
              <InfoRow icon={<LuPhone className="w-4 h-4" />} label="Telefone" value={client.phone || 'N/A'} />
              <InfoRow icon={<span style={{fontSize:"14px"}}>📍</span>} label="Endereço" value={client.address || 'N/A'} />
              {client.type === 'COMPANY' && (
                <>
                  <InfoRow icon={<span style={{fontSize:"14px"}}>🏢</span>} label="Empresa" value={client.companyName || 'N/A'} />
                  <InfoRow icon={<span style={{fontSize:"14px"}}>🏢</span>} label="CNPJ/CPF" value={client.cnpj || 'N/A'} />
                </>
              )}
              {client.type === 'INDIVIDUAL' && client.cnpj && (
                <InfoRow icon={<LuUser className="w-4 h-4" />} label="CPF" value={client.cnpj} />
              )}
              {client.website && (
                <InfoRow icon={<span style={{fontSize:"14px"}}>📍</span>} label="Website" value={client.website} />
              )}
              <InfoRow icon={<LuCalendar className="w-4 h-4" />} label="Cliente desde" value={new Date(client.createdAt).toLocaleDateString('pt-BR')} />
              <InfoRow icon={<span style={{fontSize:"14px"}}>⏱</span>} label="Atualizado em" value={new Date(client.updatedAt).toLocaleString('pt-BR')} />
            </div>
          </div>

          {/* Tags + Notes + Origin */}
          <div className="space-y-6">
            {/* Tags */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tags</h3>
              {client.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-red-600 transition-colors">
                        <span style={{fontSize:"14px"}}>✕</span>
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Nenhuma tag adicionada</p>
              )}
            </div>

            {/* Notes */}
            {client.observations && (
              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Notas</h3>
                <p className="text-gray-600 text-sm bg-gray-50 rounded-xl p-3">{client.observations}</p>
              </div>
            )}

            {/* Lead Origin */}
            {client.convertedFromLeadId && (
              <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Origem</h3>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-xl"><span style={{fontSize:"14px"}}>↔</span></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Convertido a partir de um Lead</p>
                  </div>
                  <Link
                    href={`/dashboard/crm/leads/${client.convertedFromLeadId}`}
                    className="px-4 py-2 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 transition-all"
                  >
                    Ver Lead Original
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setStatusModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Alterar Status</h3>
            <div className="mt-4 space-y-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    selectedStatus === key ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${STATUS_COLORS[key]}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setStatusModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                Cancelar
              </button>
              <button
                onClick={handleStatusChange}
                disabled={saving || selectedStatus === client.status}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {saving ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuCheck className="w-4 h-4" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {tagModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setTagModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Adicionar Tag</h3>
            <div className="mt-4">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Nome da tag..."
                className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-purple-500/50 outline-none"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setTagModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                Cancelar
              </button>
              <button
                onClick={handleAddTag}
                disabled={saving || !newTag.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {saving ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuPlus className="w-4 h-4" />}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {purchaseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPurchaseModal(false)}>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-green-500/50 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setPurchaseModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                Cancelar
              </button>
              <button
                onClick={handleRecordPurchase}
                disabled={saving || !purchaseAmount}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {saving ? <LuLoader className="w-4 h-4 animate-spin" /> : <span style={{fontSize:"14px"}}>🛒</span>}
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <span className="text-sm text-gray-500 w-32">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
