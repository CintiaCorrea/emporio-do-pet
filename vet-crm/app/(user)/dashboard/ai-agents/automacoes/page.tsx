'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LuSearch,
  LuPlus,
  LuPencil,
  LuCalendar,
  LuLoader
} from 'react-icons/lu';
import { toast } from 'sonner';

// Tipos para Automações
type AutomationStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ERROR';
type AutomationTrigger = 'SCHEDULE' | 'WEBHOOK' | 'EVENT' | 'MANUAL';
type AutomationCategory = 'ATENDIMENTO' | 'MARKETING' | 'NOTIFICACAO' | 'INTEGRACAO' | 'AGENDAMENTO';

interface AutomationStep {
  id: string;
  type: string;
  name: string;
  config?: Record<string, unknown>;
  position: number;
}

interface Automation {
  id: string;
  name: string;
  description?: string;
  category: AutomationCategory;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  triggerConfig?: Record<string, unknown>;
  agentId?: string;
  agent?: {
    id: string;
    name: string;
    status: string;
  };
  steps: AutomationStep[];
  executions: number;
  successRate: number;
  avgDuration: number;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    logs: number;
    steps: number;
  };
}

export default function AutomacoesPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AutomationStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AutomationCategory | 'all'>('all');
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('limit', '50');

      const response = await fetch(`/api/automations?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar automações');
      }

      setAutomations(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar automações:', error);
      toast.error('Erro ao carregar automações');
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const handleUpdateStatus = async (automationId: string, newStatus: AutomationStatus) => {
    setActionLoading(automationId);
    try {
      const response = await fetch(`/api/automations/${automationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar status');
      }

      toast.success(`Automação ${newStatus === 'ACTIVE' ? 'ativada' : 'pausada'} com sucesso!`);
      loadAutomations();
      
      if (selectedAutomation?.id === automationId) {
        setSelectedAutomation({ ...selectedAutomation, status: newStatus });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (automationId: string) => {
    setActionLoading(automationId);
    try {
      const response = await fetch(`/api/automations/${automationId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao duplicar automação');
      }

      toast.success('Automação duplicada com sucesso!');
      loadAutomations();
    } catch (error) {
      console.error('Erro ao duplicar automação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao duplicar automação');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecute = async (automationId: string) => {
    setActionLoading(automationId);
    try {
      const response = await fetch(`/api/automations/${automationId}/execute`, {
        method: 'POST'});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao executar automação');
      }

      toast.success(`Automação executada com sucesso! (${data.stepsExecuted} steps em ${data.duration}ms)`);
      loadAutomations();
    } catch (error) {
      console.error('Erro ao executar automação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao executar automação');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtros locais (busca por texto)
  const filteredAutomations = automations.filter(automation => {
    const matchesSearch = automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (automation.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Estatísticas
  const stats = {
    total: automations.length,
    active: automations.filter(a => a.status === 'ACTIVE').length,
    paused: automations.filter(a => a.status === 'PAUSED').length,
    totalExecutions: automations.reduce((sum, a) => sum + (a.executions || 0), 0),
    avgSuccessRate: automations.filter(a => (a.executions || 0) > 0).length > 0
      ? (automations.filter(a => (a.executions || 0) > 0).reduce((sum, a) => sum + (a.successRate || 0), 0) / automations.filter(a => (a.executions || 0) > 0).length).toFixed(1)
      : '0'
  };

  const getStatusColor = (status: AutomationStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-[#E1F5EE] text-[#0F6E56]';
      case 'PAUSED': return 'bg-orange-100 text-orange-700';
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'ERROR': return 'bg-red-100 text-red-700';
    }
  };

  const getStatusText = (status: AutomationStatus) => {
    switch (status) {
      case 'ACTIVE': return 'Ativo';
      case 'PAUSED': return 'Pausado';
      case 'DRAFT': return 'Rascunho';
      case 'ERROR': return 'Erro';
    }
  };

  const getCategoryColor = (category: AutomationCategory) => {
    switch (category) {
      case 'ATENDIMENTO': return 'bg-[#E0F4F6] text-[#009AAC]';
      case 'MARKETING': return 'bg-pink-50 text-pink-600';
      case 'NOTIFICACAO': return 'bg-orange-50 text-orange-600';
      case 'INTEGRACAO': return 'bg-[#E0F4F6] text-[#009AAC]';
      case 'AGENDAMENTO': return 'bg-[#E1F5EE] text-[#009AAC]';
    }
  };

  const getCategoryIcon = (category: AutomationCategory) => {
    switch (category) {
      case 'ATENDIMENTO': return <span style={{fontSize:"14px"}}>💬</span>;
      case 'MARKETING': return <span style={{fontSize:"14px"}}>✉</span>;
      case 'NOTIFICACAO': return <span style={{fontSize:"14px"}}>🔔</span>;
      case 'INTEGRACAO': return <span style={{fontSize:"14px"}}>🌿</span>;
      case 'AGENDAMENTO': return <LuCalendar className="w-4 h-4" />;
    }
  };

  const getCategoryText = (category: AutomationCategory) => {
    switch (category) {
      case 'ATENDIMENTO': return 'Atendimento';
      case 'MARKETING': return 'Marketing';
      case 'NOTIFICACAO': return 'Notificação';
      case 'INTEGRACAO': return 'Integração';
      case 'AGENDAMENTO': return 'Agendamento';
    }
  };

  const getTriggerIcon = (trigger: AutomationTrigger) => {
    switch (trigger) {
      case 'SCHEDULE': return <span style={{fontSize:"14px"}}>⏱</span>;
      case 'WEBHOOK': return <span style={{fontSize:"14px"}}>⚡</span>;
      case 'EVENT': return <span style={{fontSize:"14px"}}>⚡</span>;
      case 'MANUAL': return <span style={{fontSize:"14px"}}>▶</span>;
    }
  };

  const getTriggerText = (trigger: AutomationTrigger) => {
    switch (trigger) {
      case 'SCHEDULE': return 'Agendado';
      case 'WEBHOOK': return 'Webhook';
      case 'EVENT': return 'Evento';
      case 'MANUAL': return 'Manual';
    }
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('pt-BR').format(num);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#d8d0bc] border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando automações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
            
            {/* Toolbar */}
            <div className="flex justify-end mb-5">
              <Link
                href="/dashboard/ai-agents/automacoes/nova"
                className="flex items-center gap-2 bg-[#009AAC] hover:bg-[#00798A] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium"
              >
                <LuPlus className="w-4 h-4" />
                Nova automação
              </Link>
            </div>

            {/* Cards de estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-4">
              <div className="bg-[#F8F3E4] rounded-xl p-3"><p className="text-[12px] text-[#64748b]">Total</p><p className="text-[22px] font-semibold text-[#0E2244] mt-0.5">{stats.total}</p></div>
              <div className="bg-[#F8F3E4] rounded-xl p-3"><p className="text-[12px] text-[#64748b]">Ativas</p><p className="text-[22px] font-semibold text-[#0F6E56] mt-0.5">{stats.active}</p></div>
              <div className="bg-[#F8F3E4] rounded-xl p-3"><p className="text-[12px] text-[#64748b]">Pausadas</p><p className="text-[22px] font-semibold text-[#0E2244] mt-0.5">{stats.paused}</p></div>
              <div className="bg-[#F8F3E4] rounded-xl p-3"><p className="text-[12px] text-[#64748b]">Execuções</p><p className="text-[22px] font-semibold text-[#0E2244] mt-0.5">{formatNumber(stats.totalExecutions)}</p></div>
              <div className="bg-[#F8F3E4] rounded-xl p-3"><p className="text-[12px] text-[#64748b]">Taxa sucesso</p><p className="text-[22px] font-semibold text-[#0E2244] mt-0.5">{stats.avgSuccessRate}%</p></div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-[#d8d0bc] p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Buscar automações..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all" />
                </div>
                <div className="flex items-center gap-2">
                  <span style={{fontSize:"14px"}}>⌕</span>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AutomationStatus | 'all')}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all cursor-pointer">
                    <option value="all">Todos os Status</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="PAUSED">Pausado</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="ERROR">Erro</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as AutomationCategory | 'all')}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#009AAC]/40 focus:border-[#009AAC] transition-all cursor-pointer">
                    <option value="all">Todas Categorias</option>
                    <option value="ATENDIMENTO">Atendimento</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="NOTIFICACAO">Notificação</option>
                    <option value="INTEGRACAO">Integração</option>
                    <option value="AGENDAMENTO">Agendamento</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Automações */}
            {filteredAutomations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-[#d8d0bc]">
                <span style={{fontSize:"14px"}}>🔀</span>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma automação encontrada</h3>
                <p className="text-gray-500 text-center max-w-md">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Tente ajustar os filtros para encontrar a automação desejada.'
                    : 'Comece criando sua primeira automação clicando no botão acima.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAutomations.map((automation) => (
                  <div key={automation.id} onClick={() => { setSelectedAutomation(automation); setIsModalOpen(true); }}
                    className="bg-white rounded-xl border border-[#d8d0bc] p-4 hover:border-[#d8d0bc] transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${automation.status === 'ACTIVE' ? 'bg-[#E1F5EE]' : automation.status === 'PAUSED' ? 'bg-orange-50' : automation.status === 'ERROR' ? 'bg-red-50' : 'bg-gray-50'}`}>
                          <span style={{fontSize:"14px"}}>🔀</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-[#009AAC] transition-colors">{automation.name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(automation.category)}`}>
                            {getCategoryIcon(automation.category)} {getCategoryText(automation.category)}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(automation.status)}`}>{getStatusText(automation.status)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{automation.description}</p>
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-500">{getTriggerIcon(automation.trigger)}</span>
                      <span className="text-sm text-gray-600">{getTriggerText(automation.trigger)}: {automation.triggerConfig}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-4 overflow-hidden">
                      {automation.steps.slice(0, 3).map((step, idx) => (
                        <div key={step.id} className="flex items-center">
                          <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 truncate max-w-[80px]">{step.name}</div>
                          {idx < Math.min(automation.steps.length - 1, 2) && <span style={{fontSize:"14px"}}>→</span>}
                        </div>
                      ))}
                      {automation.steps.length > 3 && <span className="text-xs text-gray-400 ml-1">+{automation.steps.length - 3}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#d8d0bc]">
                      <div className="text-center"><p className="text-lg font-semibold text-gray-900">{formatNumber(automation.executions || 0)}</p><p className="text-xs text-gray-500">Execuções</p></div>
                      <div className="text-center"><p className="text-lg font-semibold text-gray-900">{(automation.successRate || 0).toFixed(1)}%</p><p className="text-xs text-gray-500">Sucesso</p></div>
                      <div className="text-center"><p className="text-lg font-semibold text-gray-900">{formatRelativeTime(automation.lastRunAt)}</p><p className="text-xs text-gray-500">Última exec.</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedAutomation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ">
            <div className="p-6 border-b border-[#d8d0bc]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${selectedAutomation.status === 'ACTIVE' ? 'bg-[#E1F5EE]' : selectedAutomation.status === 'PAUSED' ? 'bg-orange-50' : selectedAutomation.status === 'ERROR' ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <span style={{fontSize:"14px"}}>🔀</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedAutomation.name}</h2>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${getCategoryColor(selectedAutomation.category)}`}>
                      {getCategoryIcon(selectedAutomation.category)} {getCategoryText(selectedAutomation.category)}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(selectedAutomation.status)}`}>{getStatusText(selectedAutomation.status)}</span>
                <div className="flex items-center gap-2">
                  {selectedAutomation.status === 'ACTIVE' ? (
                    <button 
                      onClick={() => handleUpdateStatus(selectedAutomation.id, 'PAUSED')}
                      disabled={actionLoading === selectedAutomation.id}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedAutomation.id ? <LuLoader className="w-4 h-4 animate-spin" /> : <span style={{fontSize:"14px"}}>⏸</span>}
                      Pausar
                    </button>
                  ) : selectedAutomation.status !== 'ERROR' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedAutomation.id, 'ACTIVE')}
                      disabled={actionLoading === selectedAutomation.id}
                      className="flex items-center gap-2 px-4 py-2 bg-[#E1F5EE] hover:bg-[#E1F5EE] text-[#0F6E56] rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedAutomation.id ? <LuLoader className="w-4 h-4 animate-spin" /> : <span style={{fontSize:"14px"}}>▶</span>}
                      Ativar
                    </button>
                  )}
                  <Link 
                    href={`/dashboard/ai-agents/automacoes/${selectedAutomation.id}/editar`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
                  >
                    <LuPencil className="w-4 h-4" />
                    Editar
                  </Link>
                  <button 
                    onClick={() => handleDuplicate(selectedAutomation.id)}
                    disabled={actionLoading === selectedAutomation.id}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selectedAutomation.id ? <LuLoader className="w-4 h-4 animate-spin" /> : <span style={{fontSize:"14px"}}>⎘</span>}
                    Duplicar
                  </button>
                </div>
              </div>
              <div><h3 className="text-sm font-medium text-gray-500 mb-2">Descrição</h3><p className="text-gray-900">{selectedAutomation.description}</p></div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Gatilho</h3>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">{getTriggerIcon(selectedAutomation.trigger)}</span>
                  <div><p className="text-gray-900 font-medium">{getTriggerText(selectedAutomation.trigger)}</p><p className="text-sm text-gray-500">{selectedAutomation.triggerConfig}</p></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Fluxo de Trabalho</h3>
                <div className="space-y-2">
                  {selectedAutomation.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E1F5EE] flex items-center justify-center text-[#0F6E56] text-sm font-medium">{idx + 1}</div>
                      <div className="flex-1 p-3 bg-gray-50 rounded-xl"><p className="text-gray-900">{step.name}</p><p className="text-xs text-gray-500">{step.type}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Métricas de Performance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-2xl font-bold text-gray-900">{formatNumber(selectedAutomation.executions || 0)}</p><p className="text-sm text-gray-500">Execuções</p></div>
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-2xl font-bold text-gray-900">{(selectedAutomation.successRate || 0).toFixed(1)}%</p><p className="text-sm text-gray-500">Taxa de Sucesso</p></div>
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-2xl font-bold text-gray-900">{((selectedAutomation.avgDuration || 0) / 1000).toFixed(1)}s</p><p className="text-sm text-gray-500">Duração Média</p></div>
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-2xl font-bold text-gray-900">{formatRelativeTime(selectedAutomation.lastRunAt)}</p><p className="text-sm text-gray-500">Última Execução</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#d8d0bc]">
                <div><h3 className="text-sm font-medium text-gray-500 mb-1">Criado em</h3><p className="text-gray-900">{formatDate(selectedAutomation.createdAt)}</p></div>
                <div><h3 className="text-sm font-medium text-gray-500 mb-1">Atualizado em</h3><p className="text-gray-900">{formatDate(selectedAutomation.updatedAt)}</p></div>
              </div>
              <div className="pt-4 border-t border-[#d8d0bc]">
                <button 
                  onClick={() => handleExecute(selectedAutomation.id)}
                  disabled={actionLoading === selectedAutomation.id}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#009AAC] hover:bg-[#00798A] text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {actionLoading === selectedAutomation.id ? (
                    <>
                      <LuLoader className="w-5 h-5 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <span style={{fontSize:"14px"}}>▶</span>
                      Executar Agora
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
