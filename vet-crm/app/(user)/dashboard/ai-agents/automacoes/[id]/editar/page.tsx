'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LuChevronRight, 
  LuArrowLeft, 
  LuSave,
  LuLoader,
  LuClock,
  LuZap,
  LuGlobe,
  LuHand,
  LuTrash2,
  LuPlay,
  LuPause,
  LuHistory,
} from 'react-icons/lu';
import { toast } from 'sonner';
import AutomationStepEditor, { AutomationStep } from '@/components/protected/ai-agents/AutomationStepEditor';

type AutomationCategory = 'ATENDIMENTO' | 'MARKETING' | 'NOTIFICACAO' | 'INTEGRACAO' | 'AGENDAMENTO';
type AutomationTrigger = 'SCHEDULE' | 'WEBHOOK' | 'EVENT' | 'MANUAL';
type AutomationStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ERROR';

interface Automation {
  id: string;
  name: string;
  description?: string;
  category: AutomationCategory;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  triggerConfig?: {
    cron?: string;
    timezone?: string;
    eventType?: string;
    webhookSecret?: string;
  };
  agentId?: string;
  agent?: { id: string; name: string };
  steps: {
    id: string;
    type: string;
    name: string;
    config: Record<string, unknown>;
    position: number;
  }[];
  executions: number;
  successRate: number;
  avgDuration: number;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AutomationForm {
  name: string;
  description: string;
  category: AutomationCategory;
  trigger: AutomationTrigger;
  triggerConfig: {
    cron?: string;
    timezone?: string;
    eventType?: string;
    webhookSecret?: string;
  };
  agentId?: string;
  steps: AutomationStep[];
}

const CATEGORIES = [
  { value: 'ATENDIMENTO', label: 'Atendimento', icon: '💬' },
  { value: 'MARKETING', label: 'Marketing', icon: '📢' },
  { value: 'NOTIFICACAO', label: 'Notificação', icon: '🔔' },
  { value: 'INTEGRACAO', label: 'Integração', icon: '🔗' },
  { value: 'AGENDAMENTO', label: 'Agendamento', icon: '📅' },
];

const TRIGGERS = [
  { value: 'MANUAL', label: 'Manual', description: 'Executar manualmente', icon: <LuHand className="w-5 h-5" /> },
  { value: 'SCHEDULE', label: 'Agendado', description: 'Executar em horários específicos', icon: <LuClock className="w-5 h-5" /> },
  { value: 'EVENT', label: 'Evento', description: 'Executar quando um evento ocorrer', icon: <LuZap className="w-5 h-5" /> },
  { value: 'WEBHOOK', label: 'Webhook', description: 'Executar via chamada HTTP', icon: <LuGlobe className="w-5 h-5" /> },
];

export default function EditarAutomacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [agents, setAgents] = useState<{id: string; name: string}[]>([]);
  const [eventTypes, setEventTypes] = useState<{key: string; value: string; label: string; description: string}[]>([]);
  
  const [form, setForm] = useState<AutomationForm>({
    name: '',
    description: '',
    category: 'ATENDIMENTO',
    trigger: 'MANUAL',
    triggerConfig: {},
    steps: [],
  });

  // Load automation
  useEffect(() => {
    const loadAutomation = async () => {
      try {
        const response = await fetch(`/api/automations/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar automação');
        }

        setAutomation(data);
        setForm({
          name: data.name || '',
          description: data.description || '',
          category: data.category || 'ATENDIMENTO',
          trigger: data.trigger || 'MANUAL',
          triggerConfig: data.triggerConfig || {},
          agentId: data.agentId,
          steps: (data.steps || []).map((s: Automation['steps'][0]) => ({
            id: s.id,
            type: s.type,
            name: s.name,
            config: s.config || {},
          })),
        });
      } catch (error) {
        console.error('Erro ao carregar automação:', error);
        toast.error('Erro ao carregar automação');
        router.push('/dashboard/ai-agents/automacoes');
      } finally {
        setLoading(false);
      }
    };

    loadAutomation();
  }, [id, router]);

  // Load agents and event types
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch('/api/agents?status=ACTIVE&limit=50');
        const data = await response.json();
        if (response.ok) {
          setAgents(data.data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar agentes:', error);
      }
    };

    const loadEventTypes = async () => {
      try {
        const response = await fetch('/api/events/types');
        const data = await response.json();
        if (response.ok && Array.isArray(data)) {
          setEventTypes(data);
        }
      } catch (error) {
        console.error('Erro ao carregar tipos de eventos:', error);
      }
    };

    loadAgents();
    loadEventTypes();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome da automação é obrigatório');
      return;
    }

    if (form.steps.length === 0) {
      toast.error('Adicione pelo menos um passo na automação');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          trigger: form.trigger,
          triggerConfig: form.triggerConfig,
          agentId: form.agentId || null,
          steps: form.steps.map((s, index) => ({
            type: s.type,
            name: s.name,
            config: s.config,
            position: index,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar automação');
      }

      toast.success('Automação atualizada com sucesso!');
      setAutomation(data);
    } catch (error) {
      console.error('Erro ao salvar automação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar automação');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: AutomationStatus) => {
    try {
      const response = await fetch(`/api/automations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar status');
      }

      toast.success(`Automação ${newStatus === 'ACTIVE' ? 'ativada' : 'pausada'}!`);
      setAutomation(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status');
    }
  };

  const handleExecute = async () => {
    try {
      const response = await fetch(`/api/automations/${id}/execute`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao executar automação');
      }

      toast.success('Automação executada com sucesso!');
    } catch (error) {
      console.error('Erro ao executar automação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao executar automação');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir automação');
      }

      toast.success('Automação excluída com sucesso!');
      router.push('/dashboard/ai-agents/automacoes');
    } catch (error) {
      console.error('Erro ao excluir automação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir automação');
    }
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
      case 'ACTIVE': return 'Ativa';
      case 'PAUSED': return 'Pausada';
      case 'DRAFT': return 'Rascunho';
      case 'ERROR': return 'Erro';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando automação...</p>
        </div>
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-center">
          <LuZap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Automação não encontrada</h2>
          <Link
            href="/dashboard/ai-agents/automacoes"
            className="text-violet-600 hover:text-violet-700"
          >
            Voltar para lista de automações
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/dashboard/ai-agents/automacoes" className="hover:text-violet-600">
            AI Agents
          </Link>
          <LuChevronRight className="w-4 h-4" />
          <Link href="/dashboard/ai-agents/automacoes" className="hover:text-violet-600">
            Automações
          </Link>
          <LuChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Editar</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/ai-agents/automacoes"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LuArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Automação</h1>
              <p className="text-gray-500">{automation.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(automation.status)}`}>
              {getStatusText(automation.status)}
            </span>
            
            {automation.status === 'ACTIVE' ? (
              <button
                onClick={() => handleStatusChange('PAUSED')}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
              >
                <LuPause className="w-4 h-4" />
                Pausar
              </button>
            ) : automation.status !== 'ERROR' && (
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
              >
                <LuPlay className="w-4 h-4" />
                Ativar
              </button>
            )}

            <button
              onClick={handleExecute}
              className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg transition-colors"
            >
              <LuZap className="w-4 h-4" />
              Executar
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <LuSave className="w-4 h-4" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Execuções</p>
            <p className="text-2xl font-bold text-gray-900">{automation.executions}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Taxa de Sucesso</p>
            <p className="text-2xl font-bold text-gray-900">{(automation.successRate || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Duração Média</p>
            <p className="text-2xl font-bold text-gray-900">{((automation.avgDuration || 0) / 1000).toFixed(1)}s</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Última Execução</p>
            <p className="text-lg font-bold text-gray-900">
              {automation.lastRunAt 
                ? new Date(automation.lastRunAt).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Automação *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Lembrete de Consultas"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreva o que essa automação faz..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as AutomationCategory })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agente IA (opcional)
                  </label>
                  <select
                    value={form.agentId || ''}
                    onChange={(e) => setForm({ ...form, agentId: e.target.value || undefined })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  >
                    <option value="">Sem agente vinculado</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gatilho</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {TRIGGERS.map((trigger) => (
                <button
                  key={trigger.value}
                  onClick={() => setForm({ ...form, trigger: trigger.value as AutomationTrigger })}
                  className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-all ${
                    form.trigger === trigger.value
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {trigger.icon}
                  <span className="font-medium text-sm">{trigger.label}</span>
                  <span className="text-xs text-center opacity-70">{trigger.description}</span>
                </button>
              ))}
            </div>

            {/* Trigger Config */}
            {form.trigger === 'SCHEDULE' && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expressão Cron
                  </label>
                  <input
                    type="text"
                    value={form.triggerConfig.cron || ''}
                    onChange={(e) => setForm({ 
                      ...form, 
                      triggerConfig: { ...form.triggerConfig, cron: e.target.value }
                    })}
                    placeholder="0 8 * * * (todos os dias às 8h)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: minuto hora dia mês dia-semana
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={form.triggerConfig.timezone || 'America/Sao_Paulo'}
                    onChange={(e) => setForm({ 
                      ...form, 
                      triggerConfig: { ...form.triggerConfig, timezone: e.target.value }
                    })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                    <option value="America/Fortaleza">Fortaleza (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            )}

            {form.trigger === 'EVENT' && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Evento
                  </label>
                  <select
                    value={form.triggerConfig.eventType || ''}
                    onChange={(e) => setForm({ 
                      ...form, 
                      triggerConfig: { ...form.triggerConfig, eventType: e.target.value }
                    })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <option value="">Selecione um evento</option>
                    {eventTypes.map((event) => (
                      <option key={event.value} value={event.value}>
                        {event.label}
                      </option>
                    ))}
                  </select>
                  {form.triggerConfig.eventType && eventTypes.find(e => e.value === form.triggerConfig.eventType)?.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {eventTypes.find(e => e.value === form.triggerConfig.eventType)?.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {form.trigger === 'WEBHOOK' && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-1">URL do Webhook</p>
                  <code className="text-xs text-gray-600 break-all">
                    {process.env.NEXT_PUBLIC_API_URL || 'https://api.emporiopet.com'}/webhooks/automations/{automation.id}
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Passos da Automação</h2>
            
            <AutomationStepEditor
              steps={form.steps}
              onChange={(steps) => setForm({ ...form, steps })}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors"
            >
              <LuTrash2 className="w-5 h-5" />
              Excluir Automação
            </button>

            <Link
              href={`/api/automations/${id}/logs`}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              <LuHistory className="w-5 h-5" />
              Ver Logs
            </Link>

            <div className="flex-1" />

            <Link
              href="/dashboard/ai-agents/automacoes"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </Link>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <LuLoader className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <LuSave className="w-5 h-5" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
