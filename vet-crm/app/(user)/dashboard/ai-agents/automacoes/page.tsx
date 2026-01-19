'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LuWorkflow,
  LuSearch,
  LuFilter,
  LuPlus,
  LuPlay,
  LuPause,
  LuZap,
  LuClock,
  LuCircleCheck,
  LuActivity,
  LuX,
  LuPencil,
  LuCopy,
  LuMail,
  LuMessageSquare,
  LuCalendar,
  LuBell,
  LuArrowRight,
  LuGitBranch,
  LuChevronRight
} from 'react-icons/lu';

// Tipos para Automações
type AutomationStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ERROR';
type AutomationTrigger = 'SCHEDULE' | 'WEBHOOK' | 'EVENT' | 'MANUAL';
type AutomationCategory = 'ATENDIMENTO' | 'MARKETING' | 'NOTIFICACAO' | 'INTEGRACAO' | 'AGENDAMENTO';

interface AutomationStats {
  executions: number;
  successRate: number;
  avgDuration: number;
  lastRun?: string;
}

interface AutomationStep {
  id: string;
  type: string;
  name: string;
}

interface Automation {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  triggerConfig?: string;
  steps: AutomationStep[];
  stats: AutomationStats;
  createdAt: string;
  updatedAt: string;
}

// Mock data
const mockAutomations: Automation[] = [
  {
    id: '1',
    name: 'Lembrete de Consulta',
    description: 'Envia WhatsApp 24h antes da consulta agendada',
    category: 'NOTIFICACAO',
    status: 'ACTIVE',
    trigger: 'SCHEDULE',
    triggerConfig: 'Diariamente às 08:00',
    steps: [
      { id: 's1', type: 'query', name: 'Buscar consultas de amanhã' },
      { id: 's2', type: 'filter', name: 'Filtrar não confirmadas' },
      { id: 's3', type: 'message', name: 'Enviar WhatsApp' }
    ],
    stats: { executions: 892, successRate: 98.5, avgDuration: 2.3, lastRun: new Date().toISOString() },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-01T15:30:00Z'
  },
  {
    id: '2',
    name: 'Boas-vindas Novo Cliente',
    description: 'Sequência de emails para novos cadastros',
    category: 'MARKETING',
    status: 'ACTIVE',
    trigger: 'EVENT',
    triggerConfig: 'Novo cadastro de tutor',
    steps: [
      { id: 's1', type: 'delay', name: 'Aguardar 1 hora' },
      { id: 's2', type: 'email', name: 'Email de boas-vindas' }
    ],
    stats: { executions: 156, successRate: 94.2, avgDuration: 5.1, lastRun: new Date(Date.now() - 3600000).toISOString() },
    createdAt: '2024-02-20T08:00:00Z',
    updatedAt: '2024-11-28T12:00:00Z'
  },
  {
    id: '3',
    name: 'Alerta Estoque Baixo',
    description: 'Notifica equipe quando produto atinge estoque mínimo',
    category: 'NOTIFICACAO',
    status: 'ACTIVE',
    trigger: 'EVENT',
    triggerConfig: 'Produto abaixo do mínimo',
    steps: [
      { id: 's1', type: 'query', name: 'Verificar estoque' },
      { id: 's2', type: 'notification', name: 'Enviar alerta' }
    ],
    stats: { executions: 45, successRate: 100, avgDuration: 0.8, lastRun: new Date(Date.now() - 7200000).toISOString() },
    createdAt: '2024-03-10T14:00:00Z',
    updatedAt: '2024-11-30T18:45:00Z'
  },
  {
    id: '4',
    name: 'Follow-up Pós-Consulta',
    description: 'Envia pesquisa de satisfação após atendimento',
    category: 'ATENDIMENTO',
    status: 'PAUSED',
    trigger: 'EVENT',
    triggerConfig: 'Consulta finalizada',
    steps: [
      { id: 's1', type: 'delay', name: 'Aguardar 2 horas' },
      { id: 's2', type: 'message', name: 'Enviar pesquisa' }
    ],
    stats: { executions: 234, successRate: 87.5, avgDuration: 3.2, lastRun: '2024-11-25T18:45:00Z' },
    createdAt: '2024-04-05T11:00:00Z',
    updatedAt: '2024-11-25T18:45:00Z'
  },
  {
    id: '5',
    name: 'Sincronização N8N',
    description: 'Integra dados com sistema externo via N8N',
    category: 'INTEGRACAO',
    status: 'ACTIVE',
    trigger: 'SCHEDULE',
    triggerConfig: 'A cada 30 minutos',
    steps: [
      { id: 's1', type: 'webhook', name: 'Chamar N8N' },
      { id: 's2', type: 'update', name: 'Atualizar banco' }
    ],
    stats: { executions: 1456, successRate: 99.1, avgDuration: 4.5, lastRun: new Date().toISOString() },
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-12-01T14:30:00Z'
  },
  {
    id: '6',
    name: 'Campanha Aniversário Pet',
    description: 'Envia cupom de desconto no aniversário do pet',
    category: 'MARKETING',
    status: 'DRAFT',
    trigger: 'SCHEDULE',
    triggerConfig: 'Diariamente às 09:00',
    steps: [
      { id: 's1', type: 'query', name: 'Buscar aniversariantes' },
      { id: 's2', type: 'email', name: 'Enviar email' }
    ],
    stats: { executions: 0, successRate: 0, avgDuration: 0 },
    createdAt: '2024-12-01T09:00:00Z',
    updatedAt: '2024-12-01T09:00:00Z'
  },
  {
    id: '7',
    name: 'Reagendamento Automático',
    description: 'Oferece reagendamento quando consulta é cancelada',
    category: 'AGENDAMENTO',
    status: 'ERROR',
    trigger: 'EVENT',
    triggerConfig: 'Consulta cancelada',
    steps: [
      { id: 's1', type: 'delay', name: 'Aguardar 1 hora' },
      { id: 's2', type: 'message', name: 'Oferecer reagendamento' }
    ],
    stats: { executions: 78, successRate: 65.4, avgDuration: 1.2, lastRun: '2024-11-30T22:15:00Z' },
    createdAt: '2024-05-15T11:00:00Z',
    updatedAt: '2024-11-30T22:15:00Z'
  }
];

export default function AutomacoesPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AutomationStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AutomationCategory | 'all'>('all');
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadAutomations = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setAutomations(mockAutomations);
      setLoading(false);
    };
    loadAutomations();
  }, []);

  const filteredAutomations = automations.filter(automation => {
    const matchesSearch = automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      automation.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || automation.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || automation.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: automations.length,
    active: automations.filter(a => a.status === 'ACTIVE').length,
    paused: automations.filter(a => a.status === 'PAUSED').length,
    totalExecutions: automations.reduce((sum, a) => sum + a.stats.executions, 0),
    avgSuccessRate: automations.filter(a => a.stats.executions > 0).length > 0
      ? (automations.filter(a => a.stats.executions > 0).reduce((sum, a) => sum + a.stats.successRate, 0) / automations.filter(a => a.stats.executions > 0).length).toFixed(1)
      : 0
  };

  const getStatusColor = (status: AutomationStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
      case 'PAUSED': return 'bg-amber-100 text-amber-700';
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
      case 'ATENDIMENTO': return 'bg-blue-50 text-blue-600';
      case 'MARKETING': return 'bg-pink-50 text-pink-600';
      case 'NOTIFICACAO': return 'bg-amber-50 text-amber-600';
      case 'INTEGRACAO': return 'bg-violet-50 text-violet-600';
      case 'AGENDAMENTO': return 'bg-teal-50 text-teal-600';
    }
  };

  const getCategoryIcon = (category: AutomationCategory) => {
    switch (category) {
      case 'ATENDIMENTO': return <LuMessageSquare className="w-4 h-4" />;
      case 'MARKETING': return <LuMail className="w-4 h-4" />;
      case 'NOTIFICACAO': return <LuBell className="w-4 h-4" />;
      case 'INTEGRACAO': return <LuGitBranch className="w-4 h-4" />;
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
      case 'SCHEDULE': return <LuClock className="w-4 h-4" />;
      case 'WEBHOOK': return <LuZap className="w-4 h-4" />;
      case 'EVENT': return <LuActivity className="w-4 h-4" />;
      case 'MANUAL': return <LuPlay className="w-4 h-4" />;
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
          <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando automações...</p>
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
                <Link href="/dashboard/ai-agents/agents" className="hover:text-emerald-600 transition-colors">AI Agents</Link>
                <LuChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">Automações</span>
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Automações</h1>
                  <p className="text-gray-500 mt-1">Crie e gerencie fluxos de trabalho automatizados</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-xl">
                  <LuPlus className="w-5 h-5" />
                  Nova Automação
                </button>
              </div>
            </div>

            {/* Cards de estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50"><LuWorkflow className="w-5 h-5 text-emerald-600" /></div>
                  <div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold text-gray-900">{stats.total}</p></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50"><LuCircleCheck className="w-5 h-5 text-teal-600" /></div>
                  <div><p className="text-sm text-gray-500">Ativas</p><p className="text-2xl font-bold text-gray-900">{stats.active}</p></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50"><LuPause className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="text-sm text-gray-500">Pausadas</p><p className="text-2xl font-bold text-gray-900">{stats.paused}</p></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50"><LuZap className="w-5 h-5 text-blue-600" /></div>
                  <div><p className="text-sm text-gray-500">Execuções</p><p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalExecutions)}</p></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-50"><LuActivity className="w-5 h-5 text-violet-600" /></div>
                  <div><p className="text-sm text-gray-500">Taxa Sucesso</p><p className="text-2xl font-bold text-gray-900">{stats.avgSuccessRate}%</p></div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Buscar automações..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" />
                </div>
                <div className="flex items-center gap-2">
                  <LuFilter className="text-gray-400 w-5 h-5" />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AutomationStatus | 'all')}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer">
                    <option value="all">Todos os Status</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="PAUSED">Pausado</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="ERROR">Erro</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as AutomationCategory | 'all')}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer">
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
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                <LuWorkflow className="w-16 h-16 text-gray-300 mb-4" />
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
                    className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${automation.status === 'ACTIVE' ? 'bg-emerald-50' : automation.status === 'PAUSED' ? 'bg-amber-50' : automation.status === 'ERROR' ? 'bg-red-50' : 'bg-gray-50'}`}>
                          <LuWorkflow className={`w-5 h-5 ${automation.status === 'ACTIVE' ? 'text-emerald-600' : automation.status === 'PAUSED' ? 'text-amber-600' : automation.status === 'ERROR' ? 'text-red-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">{automation.name}</h3>
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
                          {idx < Math.min(automation.steps.length - 1, 2) && <LuArrowRight className="w-3 h-3 text-gray-400 mx-1 flex-shrink-0" />}
                        </div>
                      ))}
                      {automation.steps.length > 3 && <span className="text-xs text-gray-400 ml-1">+{automation.steps.length - 3}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                      <div className="text-center"><p className="text-lg font-semibold text-gray-900">{formatNumber(automation.stats.executions)}</p><p className="text-xs text-gray-500">Execuções</p></div>
                      <div className="text-center"><p className="text-lg font-semibold text-gray-900">{automation.stats.successRate}%</p><p className="text-xs text-gray-500">Sucesso</p></div>
                      <div className="text-center"><p className="text-lg font-semibold text-gray-900">{formatRelativeTime(automation.stats.lastRun)}</p><p className="text-xs text-gray-500">Última exec.</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedAutomation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${selectedAutomation.status === 'ACTIVE' ? 'bg-emerald-50' : selectedAutomation.status === 'PAUSED' ? 'bg-amber-50' : selectedAutomation.status === 'ERROR' ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <LuWorkflow className={`w-6 h-6 ${selectedAutomation.status === 'ACTIVE' ? 'text-emerald-600' : selectedAutomation.status === 'PAUSED' ? 'text-amber-600' : selectedAutomation.status === 'ERROR' ? 'text-red-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedAutomation.name}</h2>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${getCategoryColor(selectedAutomation.category)}`}>
                      {getCategoryIcon(selectedAutomation.category)} {getCategoryText(selectedAutomation.category)}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(selectedAutomation.status)}`}>{getStatusText(selectedAutomation.status)}</span>
                <div className="flex items-center gap-2">
                  {selectedAutomation.status === 'ACTIVE' ? (
                    <button className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"><LuPause className="w-4 h-4" />Pausar</button>
                  ) : selectedAutomation.status !== 'ERROR' && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"><LuPlay className="w-4 h-4" />Ativar</button>
                  )}
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"><LuPencil className="w-4 h-4" />Editar</button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"><LuCopy className="w-4 h-4" />Duplicar</button>
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
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-medium">{idx + 1}</div>
                      <div className="flex-1 p-3 bg-gray-50 rounded-xl"><p className="text-gray-900">{step.name}</p><p className="text-xs text-gray-500">{step.type}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Métricas de Performance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-2xl font-bold text-gray-900">{formatNumber(selectedAutomation.stats.executions)}</p><p className="text-sm text-gray-500">Execuções</p></div>
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-2xl font-bold text-gray-900">{selectedAutomation.stats.successRate}%</p><p className="text-sm text-gray-500">Taxa de Sucesso</p></div>
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-2xl font-bold text-gray-900">{selectedAutomation.stats.avgDuration}s</p><p className="text-sm text-gray-500">Duração Média</p></div>
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-2xl font-bold text-gray-900">{formatRelativeTime(selectedAutomation.stats.lastRun)}</p><p className="text-sm text-gray-500">Última Execução</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div><h3 className="text-sm font-medium text-gray-500 mb-1">Criado em</h3><p className="text-gray-900">{formatDate(selectedAutomation.createdAt)}</p></div>
                <div><h3 className="text-sm font-medium text-gray-500 mb-1">Atualizado em</h3><p className="text-gray-900">{formatDate(selectedAutomation.updatedAt)}</p></div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all"><LuPlay className="w-5 h-5" />Executar Agora</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
