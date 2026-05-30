'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  LuPlus,
  LuTrash,
  LuCheck} from 'react-icons/lu';

type WhatsAppCampaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  messageContent: string;
  audienceType: string;
  scheduledFor: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
};

export default function WhatsAppCampaignsPage() {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsAppCampaign | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    messageContent: '',
    audienceType: 'tutors',
    scheduledFor: ''});

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/whatsapp/campaigns');
      const data = await response.json();
      setCampaigns(data.data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    try {
      const response = await fetch('/api/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)});

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          messageContent: '',
          audienceType: 'tutors',
          scheduledFor: ''});
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const startCampaign = async (id: string) => {
    try {
      // First build audience
      await fetch(`/api/whatsapp/campaigns/${id}/build-audience`, {
        method: 'POST'});

      // Then start
      const response = await fetch(`/api/whatsapp/campaigns/${id}/start`, {
        method: 'POST'});

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
    }
  };

  const pauseCampaign = async (id: string) => {
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${id}/pause`, {
        method: 'POST'});

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;

    try {
      const response = await fetch(`/api/whatsapp/campaigns/${id}`, {
        method: 'DELETE'});

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300';
      case 'SCHEDULED':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'RUNNING':
        return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'COMPLETED':
        return 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300';
      case 'FAILED':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300';
      case 'PAUSED':
        return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Rascunho';
      case 'SCHEDULED':
        return 'Agendada';
      case 'RUNNING':
        return 'Em execução';
      case 'COMPLETED':
        return 'Concluída';
      case 'FAILED':
        return 'Falhou';
      case 'PAUSED':
        return 'Pausada';
      default:
        return status;
    }
  };

  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + c.deliveredCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/5 via-cyan-600/5 to-cyan-600/5 dark:from-cyan-600/20 dark:via-cyan-600/20 dark:to-cyan-600/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="relative px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/20">
                  <span style={{fontSize:"14px"}}>💬</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Campanhas WhatsApp
                </h1>
              </div>
              <p className="mt-2 text-gray-500">
                Crie campanhas via WhatsApp para seus clientes e tutores.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard/ai-agents/templates"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-white/10 border border-gray-200/80 dark:border-white/20 text-gray-700 dark:text-white rounded-xl font-medium hover:bg-white dark:hover:bg-white/20 transition-all duration-200"
              >
                <span style={{fontSize:"14px"}}>✨</span>
                Templates
              </Link>
              <Link
                href="/dashboard/ai-agents/conversas"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-white/10 border border-gray-200/80 dark:border-white/20 text-gray-700 dark:text-white rounded-xl font-medium hover:bg-white dark:hover:bg-white/20 transition-all duration-200"
              >
                <span style={{fontSize:"14px"}}>💬</span>
                Conversas
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-600 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200"
              >
                <LuPlus className="w-5 h-5" />
                Nova campanha
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/95 dark:bg-white/5 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/20">
                  <span style={{fontSize:"14px"}}>➤</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Campanhas</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 dark:bg-white/5 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/20">
                  <LuCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Enviadas</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSent}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 dark:bg-white/5 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/20">
                  <span style={{fontSize:"14px"}}>✓✓</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entregues</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDelivered}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 dark:bg-white/5 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/20">
                  <span style={{fontSize:"14px"}}>👥</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Taxa Entrega</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white/95 dark:bg-white/5 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
          <div className="p-5 border-b border-gray-200/80 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Campanhas</h2>
            <button
              onClick={fetchCampaigns}
              className="text-sm text-cyan-600 dark:text-cyan-300 hover:text-cyan-500 dark:hover:text-cyan-200 transition-colors inline-flex items-center gap-1"
            >
              <span style={{fontSize:"14px"}}>↻</span> Atualizar
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">Carregando campanhas...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 sm:p-10 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center">
                <span style={{fontSize:"14px"}}>💬</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Nenhuma campanha ainda</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-xl mx-auto">
                Crie sua primeira campanha de WhatsApp para enviar mensagens em massa para seus tutores.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <LuPlus className="w-4 h-4" /> Criar campanha
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200/80 dark:divide-white/10">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-gray-900 font-medium">{campaign.name}</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(campaign.status)}`}>
                          {getStatusLabel(campaign.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {campaign.messageContent}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span style={{fontSize:"14px"}}>👥</span>
                          {campaign.totalRecipients} destinatários
                        </span>
                        <span className="flex items-center gap-1">
                          <LuCheck className="w-3 h-3" />
                          {campaign.sentCount} enviadas
                        </span>
                        <span className="flex items-center gap-1">
                          <span style={{fontSize:"14px"}}>✓✓</span>
                          {campaign.deliveredCount} entregues
                        </span>
                        {campaign.scheduledFor && (
                          <span className="flex items-center gap-1">
                            <span style={{fontSize:"14px"}}>⏱</span>
                            Agendada: {new Date(campaign.scheduledFor).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED' || campaign.status === 'PAUSED') && (
                        <button
                          onClick={() => startCampaign(campaign.id)}
                          className="p-2 text-cyan-500 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 rounded-lg transition-colors"
                          title="Iniciar campanha"
                        >
                          <span style={{fontSize:"14px"}}>▶</span>
                        </button>
                      )}
                      {campaign.status === 'RUNNING' && (
                        <button
                          onClick={() => pauseCampaign(campaign.id)}
                          className="p-2 text-yellow-500 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/20 rounded-lg transition-colors"
                          title="Pausar campanha"
                        >
                          <span style={{fontSize:"14px"}}>⏸</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowStatsModal(true);
                        }}
                        className="p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Ver estatísticas"
                      >
                        <span style={{fontSize:"14px"}}>📊</span>
                      </button>
                      {campaign.status !== 'RUNNING' && (
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Excluir campanha"
                        >
                          <LuTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Nova Campanha</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <span style={{fontSize:"14px"}}>✕</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da campanha
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="Ex: Lembrete de vacinas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="Descrição da campanha"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mensagem
                </label>
                <textarea
                  value={formData.messageContent}
                  onChange={(e) => setFormData({ ...formData, messageContent: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="Olá {nome}, tudo bem? ..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{nome}'} para personalizar com o nome do tutor
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Audiência
                </label>
                <select
                  value={formData.audienceType}
                  onChange={(e) => setFormData({ ...formData, audienceType: e.target.value })}
                  className="w-full px-4 py-2 bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="tutors">Todos os tutores com WhatsApp</option>
                  <option value="all">Todos os contatos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Agendar para (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  className="w-full px-4 py-2 bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createCampaign}
                disabled={!formData.name || !formData.messageContent}
                className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar campanha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Estatísticas</h3>
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setSelectedCampaign(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <span style={{fontSize:"14px"}}>✕</span>
              </button>
            </div>
            <div className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">{selectedCampaign.name}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedCampaign.totalRecipients}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Enviadas</p>
                  <p className="text-2xl font-bold text-cyan-500 dark:text-cyan-400">{selectedCampaign.sentCount}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Entregues</p>
                  <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">{selectedCampaign.deliveredCount}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Lidas</p>
                  <p className="text-2xl font-bold text-cyan-500 dark:text-cyan-400">{selectedCampaign.readCount}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Falhas</p>
                  <p className="text-2xl font-bold text-red-500 dark:text-red-400">{selectedCampaign.failedCount}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Taxa Entrega</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedCampaign.sentCount > 0
                      ? Math.round((selectedCampaign.deliveredCount / selectedCampaign.sentCount) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

