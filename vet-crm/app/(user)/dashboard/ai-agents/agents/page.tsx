'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  LuCircleAlert,
  LuActivity,
  LuX,
  LuPencil,
  LuTrash2,
  LuRefreshCw,
  LuFileText,
  LuChevronRight
} from 'react-icons/lu';

// Tipos para AI Agents
type AgentStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ERROR';
type AgentType = 'CHATBOT' | 'AUTOMATION' | 'ASSISTANT' | 'SCHEDULER';

interface AgentMetrics {
  totalInteractions: number;
  successRate: number;
  avgResponseTime: number;
  lastActive?: string;
}

interface AIAgent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  template?: string;
  metrics: AgentMetrics;
  createdAt: string;
  updatedAt: string;
}

// Mock data para agentes
const mockAgents: AIAgent[] = [
  {
    id: '1',
    name: 'Atendimento WhatsApp',
    description: 'Agente para atendimento automático via WhatsApp',
    type: 'CHATBOT',
    status: 'ACTIVE',
    template: 'Atendimento Veterinário',
    metrics: {
      totalInteractions: 1250,
      successRate: 94.5,
      avgResponseTime: 1.2,
      lastActive: new Date().toISOString()
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-01T15:30:00Z'
  },
  {
    id: '2',
    name: 'Lembrete de Consultas',
    description: 'Envia lembretes automáticos de consultas agendadas',
    type: 'AUTOMATION',
    status: 'ACTIVE',
    template: 'Lembretes',
    metrics: {
      totalInteractions: 845,
      successRate: 98.2,
      avgResponseTime: 0.5,
      lastActive: new Date().toISOString()
    },
    createdAt: '2024-02-20T08:00:00Z',
    updatedAt: '2024-11-28T12:00:00Z'
  },
  {
    id: '3',
    name: 'Assistente de Vendas',
    description: 'Auxilia no processo de venda de produtos e serviços',
    type: 'ASSISTANT',
    status: 'PAUSED',
    template: 'Vendas',
    metrics: {
      totalInteractions: 320,
      successRate: 87.5,
      avgResponseTime: 2.1,
      lastActive: '2024-11-25T18:45:00Z'
    },
    createdAt: '2024-03-10T14:00:00Z',
    updatedAt: '2024-11-25T18:45:00Z'
  },
  {
    id: '4',
    name: 'Agendador Inteligente',
    description: 'Agenda consultas automaticamente baseado na disponibilidade',
    type: 'SCHEDULER',
    status: 'DRAFT',
    metrics: {
      totalInteractions: 0,
      successRate: 0,
      avgResponseTime: 0
    },
    createdAt: '2024-12-01T09:00:00Z',
    updatedAt: '2024-12-01T09:00:00Z'
  },
  {
    id: '5',
    name: 'Bot de Triagem',
    description: 'Realiza triagem inicial de emergências',
    type: 'CHATBOT',
    status: 'ERROR',
    template: 'Emergências',
    metrics: {
      totalInteractions: 156,
      successRate: 72.4,
      avgResponseTime: 1.8,
      lastActive: '2024-11-30T22:15:00Z'
    },
    createdAt: '2024-04-05T11:00:00Z',
    updatedAt: '2024-11-30T22:15:00Z'
  }
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AgentType | 'all'>('all');
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false);

  useEffect(() => {
    const loadAgents = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setAgents(mockAgents);
      setLoading(false);
    };
    loadAgents();
  }, []);

  // Filtros
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesType = typeFilter === 'all' || agent.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Estatísticas
  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'ACTIVE').length,
    paused: agents.filter(a => a.status === 'PAUSED').length,
    totalInteractions: agents.reduce((sum, a) => sum + a.metrics.totalInteractions, 0),
    avgSuccessRate: agents.length > 0 
      ? (agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.filter(a => a.metrics.successRate > 0).length).toFixed(1)
      : 0
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
      case 'PAUSED': return 'bg-amber-100 text-amber-700';
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
                <button
                  onClick={() => setIsNewAgentModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/20 transition-all duration-200 hover:shadow-xl"
                >
                  <LuPlus className="w-5 h-5" />
                  Novo Agente
                </button>
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

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50">
                    <LuCircleCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ativos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-amber-500/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50">
                    <LuPause className="w-5 h-5 text-amber-600" />
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
                          agent.status === 'ACTIVE' ? 'bg-emerald-50' :
                          agent.status === 'PAUSED' ? 'bg-amber-50' :
                          agent.status === 'ERROR' ? 'bg-red-50' : 'bg-gray-50'
                        }`}>
                          <span className={`${
                            agent.status === 'ACTIVE' ? 'text-emerald-600' :
                            agent.status === 'PAUSED' ? 'text-amber-600' :
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
                          {agent.template}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-900">{formatNumber(agent.metrics.totalInteractions)}</p>
                        <p className="text-xs text-gray-500">Interações</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-900">{agent.metrics.successRate}%</p>
                        <p className="text-xs text-gray-500">Sucesso</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-900">{agent.metrics.avgResponseTime}s</p>
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
                    selectedAgent.status === 'ACTIVE' ? 'bg-emerald-50' :
                    selectedAgent.status === 'PAUSED' ? 'bg-amber-50' :
                    selectedAgent.status === 'ERROR' ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <span className={`${
                      selectedAgent.status === 'ACTIVE' ? 'text-emerald-600' :
                      selectedAgent.status === 'PAUSED' ? 'text-amber-600' :
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
                  <LuX className="w-5 h-5 text-gray-500" />
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
                    <button className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors">
                      <LuPause className="w-4 h-4" />
                      Pausar
                    </button>
                  ) : selectedAgent.status !== 'ERROR' && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors">
                      <LuPlay className="w-4 h-4" />
                      Ativar
                    </button>
                  )}
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors">
                    <LuPencil className="w-4 h-4" />
                    Editar
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                    <LuTrash2 className="w-4 h-4" />
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
                    {selectedAgent.template}
                  </span>
                </div>
              )}

              {/* Métricas */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Métricas de Performance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(selectedAgent.metrics.totalInteractions)}</p>
                    <p className="text-sm text-gray-500">Interações Totais</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{selectedAgent.metrics.successRate}%</p>
                    <p className="text-sm text-gray-500">Taxa de Sucesso</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">{selectedAgent.metrics.avgResponseTime}s</p>
                    <p className="text-sm text-gray-500">Tempo Médio</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedAgent.metrics.lastActive 
                        ? new Date(selectedAgent.metrics.lastActive).toLocaleDateString('pt-BR')
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

              {/* Botão de Configurações */}
              <div className="pt-4 border-t border-gray-100">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-all">
                  <LuSettings className="w-5 h-5" />
                  Configurações Avançadas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Agente */}
      {isNewAgentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Criar Novo Agente</h2>
                <button
                  onClick={() => setIsNewAgentModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Agente</label>
                <input
                  type="text"
                  placeholder="Ex: Assistente de Vendas"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <textarea
                  placeholder="Descreva a função do agente..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Agente</label>
                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer">
                  <option value="">Selecione um tipo</option>
                  <option value="CHATBOT">Chatbot</option>
                  <option value="AUTOMATION">Automação</option>
                  <option value="ASSISTANT">Assistente</option>
                  <option value="SCHEDULER">Agendador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template (opcional)</label>
                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer">
                  <option value="">Selecione um template</option>
                  <option value="atendimento">Atendimento Veterinário</option>
                  <option value="vendas">Vendas</option>
                  <option value="lembretes">Lembretes</option>
                  <option value="emergencias">Emergências</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsNewAgentModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-all">
                  Criar Agente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

