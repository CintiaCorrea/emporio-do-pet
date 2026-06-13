'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuLoader,
  LuEye,
  LuCalendar,
  LuDownload,
  LuSearch,
  LuTrash} from 'react-icons/lu';
import { toast } from 'sonner';

type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
type RecipientStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  messageContent?: string;
  messageType: string;
  templateName?: string;
  audienceType: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Recipient {
  id: string;
  phone: string;
  name?: string;
  status: RecipientStatus;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedReason?: string;
}

interface Stats {
  campaignId: string;
  name: string;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  pending: number;
  deliveryRate: string;
  readRate: string;
  startedAt?: string;
  completedAt?: string;
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [recipientFilter, setRecipientFilter] = useState<RecipientStatus | 'all'>('all');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientTotal, setRecipientTotal] = useState(0);

  const loadCampaign = async () => {
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar campanha');
      }

      setCampaign(data);
    } catch (error) {
      console.error('Erro ao carregar campanha:', error);
      toast.error('Erro ao carregar campanha');
      router.push('/dashboard/campanhas/whatsapp');
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${id}/stats`);
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadRecipients = async () => {
    try {
      const params = new URLSearchParams({
        page: recipientPage.toString(),
        limit: '20'});
      if (recipientFilter !== 'all') {
        params.set('status', recipientFilter);
      }

      const response = await fetch(`/api/whatsapp/campaigns/${id}/recipients?${params}`);
      const data = await response.json();

      if (response.ok) {
        setRecipients(data.data || []);
        setRecipientTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar destinatários:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadCampaign(), loadStats(), loadRecipients()]);
      setLoading(false);
    };
    loadData();
  }, [id]);

  useEffect(() => {
    loadRecipients();
  }, [recipientFilter, recipientPage]);

  // Auto-refresh for running campaigns
  useEffect(() => {
    if (campaign?.status === 'RUNNING') {
      const interval = setInterval(() => {
        loadStats();
        loadRecipients();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [campaign?.status]);

  const handleStart = async () => {
    setActionLoading('start');
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${id}/start`, {
        method: 'POST'});
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar campanha');
      }

      toast.success('Campanha iniciada!');
      loadCampaign();
      loadStats();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async () => {
    setActionLoading('pause');
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${id}/pause`, {
        method: 'POST'});
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao pausar campanha');
      }

      toast.success('Campanha pausada!');
      loadCampaign();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao pausar campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!(await confirmDelete({ entityLabel: "campanha", itemName: "esta campanha" }))) return;

    setActionLoading('delete');
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${id}`, {
        method: 'DELETE'});

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir campanha');
      }

      toast.success('Campanha excluída!');
      router.push('/dashboard/campanhas/whatsapp');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-700';
      case 'RUNNING': return 'bg-orange-100 text-orange-700';
      case 'PAUSED': return 'bg-orange-100 text-orange-700';
      case 'COMPLETED': return 'bg-cyan-100 text-cyan-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
    }
  };

  const getStatusText = (status: CampaignStatus) => {
    switch (status) {
      case 'DRAFT': return 'Rascunho';
      case 'SCHEDULED': return 'Agendada';
      case 'RUNNING': return 'Em execução';
      case 'PAUSED': return 'Pausada';
      case 'COMPLETED': return 'Concluída';
      case 'FAILED': return 'Falhou';
    }
  };

  const getRecipientStatusColor = (status: RecipientStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-700';
      case 'SENT': return 'bg-blue-100 text-blue-700';
      case 'DELIVERED': return 'bg-cyan-100 text-cyan-700';
      case 'READ': return 'bg-violet-100 text-violet-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
    }
  };

  const getRecipientStatusText = (status: RecipientStatus) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'SENT': return 'Enviada';
      case 'DELIVERED': return 'Entregue';
      case 'READ': return 'Lida';
      case 'FAILED': return 'Falhou';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  const filteredRecipients = recipients.filter(r => {
    if (!recipientSearch) return true;
    return r.phone.includes(recipientSearch) || 
           r.name?.toLowerCase().includes(recipientSearch.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando campanha...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-center">
          <span style={{fontSize:"14px"}}>💬</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Campanha não encontrada</h2>
          <Link
            href="/dashboard/campanhas/whatsapp"
            className="text-cyan-600 hover:text-cyan-700"
          >
            Voltar para campanhas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/campanhas" className="hover:text-cyan-600">
            Campanhas
          </Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <Link href="/dashboard/campanhas/whatsapp" className="hover:text-cyan-600">
            WhatsApp
          </Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <span className="text-gray-900 font-medium">{campaign.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/campanhas/whatsapp"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LuArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                  {getStatusText(campaign.status)}
                </span>
              </div>
              {campaign.description && (
                <p className="text-gray-500 mt-1">{campaign.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {campaign.status === 'RUNNING' ? (
              <button
                onClick={handlePause}
                disabled={actionLoading === 'pause'}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'pause' ? (
                  <LuLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <span style={{fontSize:"14px"}}>⏸</span>
                )}
                Pausar
              </button>
            ) : (campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED' || campaign.status === 'PAUSED') && (
              <button
                onClick={handleStart}
                disabled={actionLoading === 'start' || campaign.totalRecipients === 0}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'start' ? (
                  <LuLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <span style={{fontSize:"14px"}}>▶</span>
                )}
                Iniciar
              </button>
            )}

            <button
              onClick={() => { loadCampaign(); loadStats(); loadRecipients(); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Atualizar"
            >
              <span style={{fontSize:"14px"}}>↻</span>
            </button>

            {campaign.status !== 'RUNNING' && (
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                title="Excluir"
              >
                {actionLoading === 'delete' ? (
                  <LuLoader className="w-5 h-5 animate-spin" />
                ) : (
                  <LuTrash className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <span style={{fontSize:"14px"}}>👥</span>
              <span className="text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.totalRecipients || campaign.totalRecipients}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <span style={{fontSize:"14px"}}>💬</span>
              <span className="text-sm">Enviadas</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats?.sentCount || campaign.sentCount}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-cyan-600 mb-1">
              <span style={{fontSize:"14px"}}>✓✓</span>
              <span className="text-sm">Entregues</span>
            </div>
            <p className="text-2xl font-bold text-cyan-600">{stats?.deliveredCount || campaign.deliveredCount}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-violet-600 mb-1">
              <LuEye className="w-4 h-4" />
              <span className="text-sm">Lidas</span>
            </div>
            <p className="text-2xl font-bold text-violet-600">{stats?.readCount || campaign.readCount}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <span style={{fontSize:"14px"}}>✗</span>
              <span className="text-sm">Falhas</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats?.failedCount || campaign.failedCount}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <span style={{fontSize:"14px"}}>⏱</span>
              <span className="text-sm">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats?.pending || 0}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {campaign.status === 'RUNNING' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-900">Progresso</span>
              <span className="text-sm text-gray-500">
                {stats ? ((stats.sentCount + stats.failedCount) / stats.totalRecipients * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                style={{ 
                  width: stats ? `${((stats.sentCount + stats.failedCount) / stats.totalRecipients * 100)}%` : '0%' 
                }}
              />
            </div>
          </div>
        )}

        {/* Campaign Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes da Campanha</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Tipo de Mensagem</span>
                <p className="text-gray-900">{campaign.messageType}</p>
              </div>
              {campaign.templateName && (
                <div>
                  <span className="text-sm text-gray-500">Template</span>
                  <p className="text-gray-900">{campaign.templateName}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-500">Tipo de Audiência</span>
                <p className="text-gray-900 capitalize">{campaign.audienceType}</p>
              </div>
              {campaign.scheduledFor && (
                <div>
                  <span className="text-sm text-gray-500">Agendada para</span>
                  <p className="text-gray-900">{formatDate(campaign.scheduledFor)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Métricas</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Taxa de Entrega</span>
                <span className="text-lg font-semibold text-cyan-600">{stats?.deliveryRate || 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Taxa de Leitura</span>
                <span className="text-lg font-semibold text-violet-600">{stats?.readRate || 0}%</span>
              </div>
              {campaign.startedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Iniciada em</span>
                  <span className="text-gray-900">{formatDate(campaign.startedAt)}</span>
                </div>
              )}
              {campaign.completedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Concluída em</span>
                  <span className="text-gray-900">{formatDate(campaign.completedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Preview */}
        {campaign.messageContent && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview da Mensagem</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-900 whitespace-pre-wrap">{campaign.messageContent}</p>
            </div>
          </div>
        )}

        {/* Recipients Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Destinatários ({recipientTotal})
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <select
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value as RecipientStatus | 'all')}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="all">Todos</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="SENT">Enviadas</option>
                  <option value="DELIVERED">Entregues</option>
                  <option value="READ">Lidas</option>
                  <option value="FAILED">Falhas</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enviada</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entregue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Nenhum destinatário encontrado
                    </td>
                  </tr>
                ) : (
                  filteredRecipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{recipient.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{recipient.name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRecipientStatusColor(recipient.status)}`}>
                          {getRecipientStatusText(recipient.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {recipient.sentAt ? new Date(recipient.sentAt).toLocaleTimeString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {recipient.deliveredAt ? new Date(recipient.deliveredAt).toLocaleTimeString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {recipient.readAt ? new Date(recipient.readAt).toLocaleTimeString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {recipientTotal > 20 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Mostrando {((recipientPage - 1) * 20) + 1} - {Math.min(recipientPage * 20, recipientTotal)} de {recipientTotal}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRecipientPage(p => Math.max(1, p - 1))}
                  disabled={recipientPage === 1}
                  className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setRecipientPage(p => p + 1)}
                  disabled={recipientPage * 20 >= recipientTotal}
                  className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
