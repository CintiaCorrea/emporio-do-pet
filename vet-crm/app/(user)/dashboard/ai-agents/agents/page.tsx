'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import { 
  LuBot,
  LuSearch,
  LuFilter,
  LuPlus,
  LuPlay,
  LuPause,
  LuSettings,
  LuZap,
  LuMessageSquare,
  LuTrendingUp,
  LuClock,
  LuCircleCheck,
  LuActivity,
  LuPencil,
  LuTrash2,
  LuFileText,
  LuChevronRight,
  LuLoader
} from 'react-icons/lu';
import { toast } from 'sonner';

// Tipos para AI Agents
type AgentStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ERROR';
type AgentType = 'CHATBOT' | 'AUTOMATION' | 'ASSISTANT' | 'SCHEDULER';
type AIProvider = 'OPENAI' | 'GEMINI' | 'DEEPSEEK';

interface AIAgent {
  id: string;
  name: string;
  description?: string;
  type: AgentType;
  status: AgentStatus;
  provider: AIProvider;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  templateId?: string;
  template?: {
    id: string;
    name: string;
    category: string;
  };
  totalInteractions: number;
  successRate: number;
  avgResponseTime: number;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    executions: number;
    automations?: number;
  };
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AgentType | 'all'>('all');
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AIAgent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      params.set('limit', '50');

      const response = await fetch(`/api/agents?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar agentes');
      }

      setAgents(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
      toast.error('Erro ao carregar agentes');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleUpdateStatus = async (agentId: string, newStatus: AgentStatus) => {
    setActionLoading(agentId);
    try {
      const response = await fetch(`/api/agents/${agentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar status');
      }

      toast.success(`Agente ${newStatus === 'ACTIVE' ? 'ativado' : 'pausado'} com sucesso!`);
      loadAgents();
      
      if (selectedAgent?.id === agentId) {
        setSelectedAgent({ ...selectedAgent, status: newStatus });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;

    const deletingAgent = agentToDelete;
    setActionLoading(deletingAgent.id);
    try {
      const response = await fetch(`/api/agents/${deletingAgent.id}`, {
        method: 'DELETE'});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir agente');
      }

      toast.success('Agente excluído com sucesso!');
      setIsModalOpen(false);
      setSelectedAgent(null);
      await loadAgents();
    } catch (error) {
      console.error('Erro ao excluir agente:', error);
      throw error instanceof Error ? error : new Error('Erro ao excluir agente');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtros locais (busca por texto)
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Estatísticas
  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'ACTIVE').length,
    paused: agents.filter(a => a.status === 'PAUSED').length,
    totalInteractions: agents.reduce((sum, a) => sum + (a.totalInteractions || 0), 0),
    avgSuccessRate: agents.length > 0 
      ? (agents.reduce((sum, a) => sum + (a.successRate || 0), 0) / (agents.filter(a => (a.successRate || 0) > 0).length || 1)).toFixed(1)
      : '0'
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-cyan-100 text-cyan-700';
      case 'PAUSED': return 'bg-orange-100 text-orange-700';
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'ERROR': return 'bg-red-100 text-red-700';
    }
  };

  const getStatusText = (status: AgentStatus) => {
    switch (status) {
      case 'ACTIVE': return 'Ativo';
      case 'PAUSED': return 'Pausado';
      case 'DRAFT': return 'Rascunho';
      case 'ERROR': return 'Erro';
    }
  };

  const getTypeIcon = (type: AgentType) => {
    switch (type) {
      case 'CHATBOT': return <LuMessageSquare className="w-4 h-4" />;
      case 'AUTOMATION': return <LuZap className="w-4 h-4" />;
      case 'ASSISTANT': return <LuBot className="w-4 h-4" />;
      case 'SCHEDULER': return <LuClock className="w-4 h-4" />;
    }
  };

  const getTypeText = (type: AgentType) => {
    switch (type) {
      case 'CHATBOT': return 'Chatbot';
      case 'AUTOMATION': return 'Automação';
      case 'ASSISTANT': return 'Assistente';
      case 'SCHEDULER': return 'Agendador';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openAgentDetails = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando agentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
            
            {/* Breadcrumb e Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="text-gray-500">AI Agents</span>
                <LuChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">Agents</span>
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Agents
                  </h1>
                  <p className="text-gray-500 mt-1">
                    Gerencie seus agentes inteligentes de automação
                  </p>
                </div>
                <Link
                  href="/dashboard/ai-agents/agents/novo"
                  className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/20 transition-all duration-200 hover:shadow-xl"
                >
                  <LuPlus className="w-5 h-5" />
                  Novo Agente
                </Link>
              </div>
            </div>

            {/* Cards de estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-violet-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-50">
                    <LuBot className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-cyan-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-50">
                    <LuCircleCheck className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ativos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-orange-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-50">
                    <LuPause className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pausados</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.paused}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50">
                    <LuActivity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Interações</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalInteractions)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-fuchsia-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-fuchsia-50">
                    <LuTrendingUp className="w-5 h-5 text-fuchsia-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taxa Sucesso</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.avgSuccessRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Busca */}
                <div className="flex-1 relative">
                  <LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar agentes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  />
                </div>

                {/* Filtro Status */}
                <div className="flex items-center gap-2">
                  <LuFilter className="text-gray-400 w-5 h-5" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as AgentStatus | 'all')}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all cursor-pointer"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="PAUSED">Pausado</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="ERROR">Erro</option>
                  </select>
                </div>

                {/* Filtro Tipo */}
                <div className="flex items-center gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as AgentType | 'all')}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all cursor-pointer"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="CHATBOT">Chatbot</option>
                    <option value="AUTOMATION">Automação</option>
                    <option value="ASSISTANT">Assistente</option>
                    <option value="SCHEDULER">Agendador</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Agentes */}
            {filteredAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                <LuBot className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum agente encontrado</h3>
                <p className="text-gray-500 text-center max-w-md">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Tente ajustar os filtros para encontrar o agente desejado.'
                    : 'Comece criando seu primeiro agente de IA clicando no botão acima.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => openAgentDetails(agent)}
                    className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-violet-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          agent.status === 'ACTIVE' ? 'bg-cyan-50' :
                          agent.status === 'PAUSED' ? 'bg-orange-50' :
                          agent.status === 'ERROR' ? 'bg-red-50' : 'bg-gray-50'
                        }`}>
                          <span className={`${
                            agent.status === 'ACTIVE' ? 'text-cyan-600' :
                            agent.status === 'PAUSED' ? 'text-orange-600' :
                            agent.status === 'ERROR' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {getTypeIcon(agent.type)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">
                            {agent.name}
                          </h3>
                          <p className="text-sm text-gray-500">{getTypeText(agent.type)}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(agent.status)}`}>
                        {getStatusText(agent.status)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {agent.description}
                    </p>

                    {agent.template && (
                      <div className="mb-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-600 text-xs rounded-full">
                          <LuFileText className="w-3 h-3" />
                          {agent.template.name}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-900">{formatNumber(agent.totalInteractions || 0)}</p>
                        <p className="text-xs text-gray-500">Interações</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-900">{(agent.successRate || 0).toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">Sucesso</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-900">{((agent.avgResponseTime || 0) / 1000).toFixed(1)}s</p>
                        <p className="text-xs text-gray-500">Resp. Média</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

      {/* Modal de Detalhes do Agente */}
      {isModalOpen && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    selectedAgent.status === 'ACTIVE' ? 'bg-cyan-50' :
                    selectedAgent.status === 'PAUSED' ? 'bg-orange-50' :
                    selectedAgent.status === 'ERROR' ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <span className={`${
                      selectedAgent.status === 'ACTIVE' ? 'text-cyan-600' :
                      selectedAgent.status === 'PAUSED' ? 'text-orange-600' :
                      selectedAgent.status === 'ERROR' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {getTypeIcon(selectedAgent.type)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedAgent.name}</h2>
                    <p className="text-gray-500">{getTypeText(selectedAgent.type)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status e Ações */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(selectedAgent.status)}`}>
                  {getStatusText(selectedAgent.status)}
                </span>
                <div className="flex items-center gap-2">
                  {selectedAgent.status === 'ACTIVE' ? (
                    <button 
                      onClick={() => handleUpdateStatus(selectedAgent.id, 'PAUSED')}
                      disabled={actionLoading === selectedAgent.id}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedAgent.id ? (
                        <LuLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <LuPause className="w-4 h-4" />
                      )}
                      Pausar
                    </button>
                  ) : selectedAgent.status !== 'ERROR' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedAgent.id, 'ACTIVE')}
                      disabled={actionLoading === selectedAgent.id}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedAgent.id ? (
                        <LuLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <LuPlay className="w-4 h-4" />
                      )}
                      Ativar
                    </button>
                  )}
                  <Link 
                    href={`/dashboard/ai-agents/agents/${selectedAgent.id}/editar`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
                  >
                    <LuPencil className="w-4 h-4" />
                    Editar
                  </Link>
                  <button 
                    onClick={() => setAgentToDelete(selectedAgent)}
                    disabled={actionLoading === selectedAgent.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selectedAgent.id ? (
                      <LuLoader className="w-4 h-4 animate-spin" />
                    ) : (
                      <LuTrash2 className="w-4 h-4" />
                    )}
                    Excluir
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Descrição</h3>
                <p className="text-gray-900">{selectedAgent.description}</p>
              </div>

              {/* Template */}
              {selectedAgent.template && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Template</h3>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-600 rounded-lg">
                    <LuFileText className="w-4 h-4" />
                    {selectedAgent.template.name}
                  </span>
                </div>
              )}

              {/* Provider e Modelo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Provider</h3>
                  <span className="text-gray-900">{selectedAgent.provider}</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Modelo</h3>
                  <span className="text-gray-900">{selectedAgent.model}</span>
                </div>
              </div>

              {/* Métricas */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Métricas de Performance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(selectedAgent.totalInteractions || 0)}</p>
                    <p className="text-sm text-gray-500">Interações Totais</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{(selectedAgent.successRate || 0).toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">Taxa de Sucesso</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{((selectedAgent.avgResponseTime || 0) / 1000).toFixed(1)}s</p>
                    <p className="text-sm text-gray-500">Tempo Médio</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedAgent.lastActiveAt 
                        ? new Date(selectedAgent.lastActiveAt).toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                    <p className="text-sm text-gray-500">Última Atividade</p>
                  </div>
                </div>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Criado em</h3>
                  <p className="text-gray-900">{formatDate(selectedAgent.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Atualizado em</h3>
                  <p className="text-gray-900">{formatDate(selectedAgent.updatedAt)}</p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <Link
                  href={`/dashboard/ai-agents/agents/${selectedAgent.id}/testar`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-all"
                >
                  <LuMessageSquare className="w-5 h-5" />
                  Testar Agente
                </Link>
                <button
                  onClick={() => router.push(`/dashboard/ai-agents/agents/${selectedAgent.id}/editar`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
                >
                  <LuSettings className="w-5 h-5" />
                  Configurações Avançadas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!agentToDelete}
        entityLabel="Agente"
        itemName={agentToDelete?.name ?? ''}
        consequenceText="Esta ação não pode ser desfeita. Os dados do agente serão removidos."
        onClose={() => setAgentToDelete(null)}
        onConfirm={handleDeleteAgent}
      />

    </div>
  );
}

