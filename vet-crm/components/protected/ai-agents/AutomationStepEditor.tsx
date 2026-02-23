'use client';

import { useState } from 'react';
import { 
  LuGripVertical,
  LuTrash2,
  LuPlus,
  LuDatabase,
  LuFilter,
  LuMessageSquare,
  LuMail,
  LuClock,
  LuGlobe,
  LuBot,
  LuBell,
  LuChevronDown,
  LuChevronUp,
  LuSettings
} from 'react-icons/lu';

export interface AutomationStep {
  id: string;
  type: string;
  name: string;
  config?: Record<string, unknown>;
  position: number;
}

interface StepType {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  configFields?: ConfigField[];
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

const STEP_TYPES: StepType[] = [
  {
    value: 'query',
    label: 'Consulta',
    description: 'Buscar dados no banco',
    icon: <LuDatabase className="w-4 h-4" />,
    configFields: [
      { key: 'entity', label: 'Entidade', type: 'select', options: [
        { value: 'tutors', label: 'Tutores' },
        { value: 'pets', label: 'Pets' },
        { value: 'appointments', label: 'Consultas' },
        { value: 'products', label: 'Produtos' },
      ]},
      { key: 'filter', label: 'Filtro', type: 'textarea', placeholder: 'Ex: status = "SCHEDULED"' },
    ],
  },
  {
    value: 'filter',
    label: 'Filtro',
    description: 'Filtrar resultados anteriores',
    icon: <LuFilter className="w-4 h-4" />,
    configFields: [
      { key: 'condition', label: 'Condição', type: 'textarea', placeholder: 'Ex: data >= hoje AND confirmado = false' },
    ],
  },
  {
    value: 'message',
    label: 'Mensagem WhatsApp',
    description: 'Enviar mensagem via WhatsApp',
    icon: <LuMessageSquare className="w-4 h-4" />,
    configFields: [
      { key: 'template', label: 'Template', type: 'textarea', placeholder: 'Olá {nome}! Sua consulta é amanhã.' },
      { key: 'phoneField', label: 'Campo do telefone', type: 'text', placeholder: 'telefone' },
    ],
  },
  {
    value: 'email',
    label: 'E-mail',
    description: 'Enviar e-mail',
    icon: <LuMail className="w-4 h-4" />,
    configFields: [
      { key: 'subject', label: 'Assunto', type: 'text', placeholder: 'Lembrete de consulta' },
      { key: 'template', label: 'Corpo do e-mail', type: 'textarea', placeholder: 'Olá {nome}...' },
      { key: 'emailField', label: 'Campo do email', type: 'text', placeholder: 'email' },
    ],
  },
  {
    value: 'delay',
    label: 'Aguardar',
    description: 'Pausar execução',
    icon: <LuClock className="w-4 h-4" />,
    configFields: [
      { key: 'duration', label: 'Duração (ms)', type: 'number', placeholder: '3600000' },
      { key: 'unit', label: 'Unidade', type: 'select', options: [
        { value: 'ms', label: 'Milissegundos' },
        { value: 's', label: 'Segundos' },
        { value: 'm', label: 'Minutos' },
        { value: 'h', label: 'Horas' },
      ]},
    ],
  },
  {
    value: 'webhook',
    label: 'Webhook',
    description: 'Chamar URL externa',
    icon: <LuGlobe className="w-4 h-4" />,
    configFields: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/webhook' },
      { key: 'method', label: 'Método', type: 'select', options: [
        { value: 'POST', label: 'POST' },
        { value: 'GET', label: 'GET' },
        { value: 'PUT', label: 'PUT' },
      ]},
      { key: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer token"}' },
    ],
  },
  {
    value: 'ai_chat',
    label: 'IA Chat',
    description: 'Gerar texto com IA',
    icon: <LuBot className="w-4 h-4" />,
    configFields: [
      { key: 'agentId', label: 'ID do Agente', type: 'text', placeholder: 'UUID do agente' },
      { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Gere uma mensagem personalizada para {nome}' },
    ],
  },
  {
    value: 'notification',
    label: 'Notificação',
    description: 'Enviar notificação no sistema',
    icon: <LuBell className="w-4 h-4" />,
    configFields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Nova ação necessária' },
      { key: 'message', label: 'Mensagem', type: 'textarea', placeholder: 'Detalhes da notificação...' },
      { key: 'type', label: 'Tipo', type: 'select', options: [
        { value: 'info', label: 'Informação' },
        { value: 'warning', label: 'Alerta' },
        { value: 'success', label: 'Sucesso' },
        { value: 'error', label: 'Erro' },
      ]},
    ],
  },
];

interface AutomationStepEditorProps {
  steps: AutomationStep[];
  onChange: (steps: AutomationStep[]) => void;
}

export default function AutomationStepEditor({ steps, onChange }: AutomationStepEditorProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const getStepType = (type: string): StepType | undefined => {
    return STEP_TYPES.find(st => st.value === type);
  };

  const addStep = (type: string) => {
    const stepType = getStepType(type);
    const newStep: AutomationStep = {
      id: `step-${Date.now()}`,
      type,
      name: stepType?.label || type,
      config: {},
      position: steps.length,
    };
    const newSteps = [...steps, newStep];
    onChange(newSteps);
    setExpandedSteps(prev => new Set([...prev, newStep.id]));
  };

  const removeStep = (index: number) => {
    const newSteps = steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, position: i }));
    onChange(newSteps);
  };

  const updateStep = (index: number, updates: Partial<AutomationStep>) => {
    const newSteps = steps.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    );
    onChange(newSteps);
  };

  const updateStepConfig = (index: number, key: string, value: unknown) => {
    const step = steps[index];
    const newConfig = { ...step.config, [key]: value };
    updateStep(index, { config: newConfig });
  };

  const toggleExpanded = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSteps = [...steps];
    const [removed] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, removed);
    
    // Update positions
    const reorderedSteps = newSteps.map((step, i) => ({ ...step, position: i }));
    onChange(reorderedSteps);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Step List */}
      <div className="space-y-2">
        {steps.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <LuSettings className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Nenhum passo adicionado</p>
            <p className="text-gray-400 text-xs">Adicione passos abaixo para criar o fluxo</p>
          </div>
        ) : (
          steps.map((step, index) => {
            const stepType = getStepType(step.type);
            const isExpanded = expandedSteps.has(step.id);

            return (
              <div
                key={step.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`border rounded-xl transition-all ${
                  draggedIndex === index 
                    ? 'border-violet-400 bg-violet-50 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Step Header */}
                <div className="flex items-center gap-3 p-3">
                  <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                    <LuGripVertical className="w-4 h-4" />
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      {stepType?.icon || <LuSettings className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(index, { name: e.target.value })}
                        className="font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                      />
                      <p className="text-xs text-gray-500">{stepType?.description}</p>
                    </div>
                  </div>

                  <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                    #{index + 1}
                  </span>

                  <button
                    onClick={() => toggleExpanded(step.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {isExpanded ? <LuChevronUp className="w-4 h-4" /> : <LuChevronDown className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => removeStep(index)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LuTrash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Step Config */}
                {isExpanded && stepType?.configFields && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    {stepType.configFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {field.label}
                        </label>
                        {field.type === 'text' && (
                          <input
                            type="text"
                            value={(step.config?.[field.key] as string) || ''}
                            onChange={(e) => updateStepConfig(index, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          />
                        )}
                        {field.type === 'number' && (
                          <input
                            type="number"
                            value={(step.config?.[field.key] as number) || ''}
                            onChange={(e) => updateStepConfig(index, field.key, parseInt(e.target.value))}
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          />
                        )}
                        {field.type === 'textarea' && (
                          <textarea
                            value={(step.config?.[field.key] as string) || ''}
                            onChange={(e) => updateStepConfig(index, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                          />
                        )}
                        {field.type === 'select' && (
                          <select
                            value={(step.config?.[field.key] as string) || ''}
                            onChange={(e) => updateStepConfig(index, field.key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          >
                            <option value="">Selecione...</option>
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Step */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-violet-300 transition-colors">
        <p className="text-sm font-medium text-gray-700 mb-3">Adicionar Passo</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STEP_TYPES.map((stepType) => (
            <button
              key={stepType.value}
              onClick={() => addStep(stepType.value)}
              className="flex items-center gap-2 p-2 text-sm text-gray-600 bg-gray-50 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors"
            >
              {stepType.icon}
              <span>{stepType.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
