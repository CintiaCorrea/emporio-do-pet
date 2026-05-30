'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LuArrowLeft, 
  LuSave,
  LuLoader
} from 'react-icons/lu';
import { toast } from 'sonner';
import AutomationStepEditor, { AutomationStep } from '@/components/protected/ai-agents/AutomationStepEditor';

type AutomationCategory = 'ATENDIMENTO' | 'MARKETING' | 'NOTIFICACAO' | 'INTEGRACAO' | 'AGENDAMENTO';
type AutomationTrigger = 'SCHEDULE' | 'WEBHOOK' | 'EVENT' | 'MANUAL';

interface AutomationForm {
  name: string;
  description: string;
  category: AutomationCategory;
  trigger: AutomationTrigger;
  triggerConfig: {
    cron? (() => null) : string;
    timezone? (() => null) : string;
    eventType? (() => null) : string;
    webhookSecret? (() => null) : string;
  };
  agentId? (() => null) : string;
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
  { value: 'MANUAL', label: 'Manual', description: 'Executar manualmente', icon: <span style={{fontSize:"14px"}}>✋</span> },
  { value: 'SCHEDULE', label: 'Agendado', description: 'Executar em horários específicos', icon: <span style={{fontSize:"14px"}}>⏱</span> },
  { value: 'EVENT', label: 'Evento', description: 'Executar quando um evento ocorrer', icon: <span style={{fontSize:"14px"}}>⚡</span> },
  { value: 'WEBHOOK', label: 'Webhook', description: 'Executar via chamada HTTP', icon: <span style={{fontSize:"14px"}}>🌐</span> },
];

export default function NovaAutomacaoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<{id: string; name: string}[]>([]);
  const [eventTypes, setEventTypes] = useState<{key: string; value: string; label: string; description: string}[]>([]);
  const [form, setForm] = useState<AutomationForm>({
    name: '',
    description: '',
    category: 'ATENDIMENTO',
    trigger: 'MANUAL',
    triggerConfig: {},
    steps: []});

  useEffect(() => {
    loadAgents();
    loadEventTypes();
  }, []);

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
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          trigger: form.trigger,
          triggerConfig: form.triggerConfig,
          agentId: form.agentId || undefined,
          steps: form.steps.map(s => ({
            type: s.type,
            name: s.name,
            config: s.config}))})});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar automação');
      }

      toast.success('Automação criada com sucesso!');
      router.push('/dashboard/ai-agents/automacoes');
    } catch (error) {
      console.error('Erro ao criar automação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar automação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/dashboard/ai-agents/automacoes" className="hover:text-violet-600">
            AI Agents
          </Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <Link href="/dashboard/ai-agents/automacoes" className="hover:text-violet-600">
            Automações
          </Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <span className="text-gray-900 font-medium">Nova Automação</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LuArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nova Automação</h1>
              <p className="text-gray-500">Crie um fluxo automatizado de tarefas</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <LuLoader className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <LuSave className="w-5 h-5" />
                Salvar
              </>
            )}
          </button>
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
                    https://api.emporiopet.com/webhooks/automations/{'{automation_id}'}
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    A URL será gerada após salvar a automação
                  </p>
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
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <LuLoader className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <LuSave className="w-5 h-5" />
                  Criar Automação
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
