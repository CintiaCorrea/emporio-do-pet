'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuSave,
  LuLoader,
  LuTrash} from 'react-icons/lu';
import { toast } from 'sonner';

type AgentStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ERROR';
type AgentType = 'CHATBOT' | 'AUTOMATION' | 'ASSISTANT' | 'SCHEDULER';
type AIProvider = 'OPENAI' | 'GEMINI' | 'DEEPSEEK';

type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
type TTSModel = 'tts-1' | 'tts-1-hd';

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
  // Voice settings
  voiceEnabled: boolean;
  voiceId: TTSVoice;
  voiceSpeed: number;
  voiceModel: TTSModel;
  // Metrics
  totalInteractions: number;
  successRate: number;
  avgResponseTime: number;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

const VOICES: { value: TTSVoice; label: string; description: string; gender: string }[] = [
  { value: 'nova', label: 'Nova', description: 'Amigável e expressiva', gender: 'Feminina' },
  { value: 'shimmer', label: 'Shimmer', description: 'Suave e gentil', gender: 'Feminina' },
  { value: 'alloy', label: 'Alloy', description: 'Neutra e equilibrada', gender: 'Neutra' },
  { value: 'echo', label: 'Echo', description: 'Calorosa e envolvente', gender: 'Masculina' },
  { value: 'fable', label: 'Fable', description: 'Narrativa britânica', gender: 'Neutra' },
  { value: 'onyx', label: 'Onyx', description: 'Profunda e autoritária', gender: 'Masculina' },
];

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
}

const MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  OPENAI: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  GEMINI: [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-pro', label: 'Gemini Pro' },
  ],
  DEEPSEEK: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' },
  ]};

export default function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'CHATBOT' as AgentType,
    provider: 'OPENAI' as AIProvider,
    model: 'gpt-4o-mini',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 4096,
    templateId: '',
    // Voice settings
    voiceEnabled: false,
    voiceId: 'nova' as TTSVoice,
    voiceSpeed: 1.0,
    voiceModel: 'tts-1' as TTSModel});

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // RAG state
  const [ragEnabled, setRagEnabled] = useState(false);
  const [knowledgeBaseIds, setKnowledgeBaseIds] = useState<string[]>([]);
  const [ragTopK, setRagTopK] = useState(5);
  const [ragThreshold, setRagThreshold] = useState(0.7);
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);

  // Load agent data
  useEffect(() => {
    const loadAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar agente');
        }

        setAgent(data);
        setFormData({
          name: data.name || '',
          description: data.description || '',
          type: data.type || 'CHATBOT',
          provider: data.provider || 'OPENAI',
          model: data.model || 'gpt-4o-mini',
          systemPrompt: data.systemPrompt || '',
          temperature: data.temperature || 0.7,
          maxTokens: data.maxTokens || 4096,
          templateId: data.templateId || '',
          // Voice settings
          voiceEnabled: data.voiceEnabled || false,
          voiceId: data.voiceId || 'nova',
          voiceSpeed: data.voiceSpeed || 1.0,
          voiceModel: data.voiceModel || 'tts-1'});
        // Show voice settings if voice is enabled
        if (data.voiceEnabled) {
          setShowVoiceSettings(true);
        }
        // RAG settings
        setRagEnabled(data.ragEnabled || false);
        setKnowledgeBaseIds(
          data.knowledgeBaseIds?.length > 0
            ? data.knowledgeBaseIds
            : data.knowledgeBaseId ? [data.knowledgeBaseId] : []
        );
        setRagTopK(data.ragTopK || 5);
        setRagThreshold(data.ragThreshold || 0.7);
      } catch (error) {
        console.error('Erro ao carregar agente:', error);
        toast.error('Erro ao carregar agente');
        router.push('/dashboard/ai-agents/agents');
      } finally {
        setLoading(false);
      }
    };

    const loadTemplates = async () => {
      try {
        const response = await fetch('/api/templates?status=PUBLISHED&limit=50');
        const data = await response.json();
        if (response.ok) {
          setTemplates(data.data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar templates:', error);
      }
    };

    const loadKnowledgeBases = async () => {
      try {
        const response = await fetch('/api/knowledge-bases');
        const data = await response.json();
        if (response.ok) {
          setKnowledgeBases(data.data || data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar bases de conhecimento:', error);
      }
    };

    loadAgent();
    loadTemplates();
    loadKnowledgeBases();
  }, [id, router]);

  // Handle provider change - reset model
  const handleProviderChange = (provider: AIProvider) => {
    const defaultModel = MODELS[provider][0]?.value || '';
    setFormData(prev => ({
      ...prev,
      provider,
      model: defaultModel}));
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setFormData(prev => ({ ...prev, templateId }));
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template && template.content) {
        setFormData(prev => ({
          ...prev,
          systemPrompt: template.content}));
      }
    }
  };

  // Save agent
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }
    if (!formData.systemPrompt.trim()) {
      toast.error('System Prompt é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          provider: formData.provider,
          model: formData.model,
          systemPrompt: formData.systemPrompt,
          temperature: formData.temperature,
          maxTokens: formData.maxTokens,
          templateId: formData.templateId || null,
          // Voice settings
          voiceEnabled: formData.voiceEnabled,
          voiceId: formData.voiceId,
          voiceSpeed: formData.voiceSpeed,
          voiceModel: formData.voiceModel,
          // RAG settings
          knowledgeBaseIds,
          ragEnabled,
          ragTopK,
          ragThreshold})});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar agente');
      }

      toast.success('Agente atualizado com sucesso!');
      setAgent(data);
    } catch (error) {
      console.error('Erro ao salvar agente:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar agente');
    } finally {
      setSaving(false);
    }
  };

  // Update status
  const handleStatusChange = async (newStatus: AgentStatus) => {
    try {
      const response = await fetch(`/api/agents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar status');
      }

      toast.success(`Agente ${newStatus === 'ACTIVE' ? 'ativado' : 'pausado'}!`);
      setAgent(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status');
    }
  };

  // Delete agent
  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE'});

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir agente');
      }

      toast.success('Agente excluído com sucesso!');
      router.push('/dashboard/ai-agents/agents');
    } catch (error) {
      console.error('Erro ao excluir agente:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir agente');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando agente...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-center">
          <span style={{fontSize:"14px"}}>🤖</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Agente não encontrado</h2>
          <Link
            href="/dashboard/ai-agents/agents"
            className="text-violet-600 hover:text-violet-700"
          >
            Voltar para lista de agentes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/ai-agents/agents" className="hover:text-violet-600">
            AI Agents
          </Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <Link href="/dashboard/ai-agents/agents" className="hover:text-violet-600">
            Agents
          </Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <span className="text-gray-900 font-medium">Editar</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/ai-agents/agents"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LuArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Agente</h1>
              <p className="text-gray-500">{agent.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(agent.status)}`}>
              {getStatusText(agent.status)}
            </span>
            
            {agent.status === 'ACTIVE' ? (
              <button
                onClick={() => handleStatusChange('PAUSED')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors"
              >
                <span style={{fontSize:"14px"}}>⏸</span>
                Pausar
              </button>
            ) : agent.status !== 'ERROR' && (
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg transition-colors"
              >
                <span style={{fontSize:"14px"}}>▶</span>
                Ativar
              </button>
            )}

            <Link
              href={`/dashboard/ai-agents/agents/${id}/testar`}
              className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg transition-colors"
            >
              <span style={{fontSize:"14px"}}>💬</span>
              Testar
            </Link>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span style={{fontSize:"14px"}}>🤖</span>
              Informações Básicas
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Agente *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  placeholder="Ex: Assistente de Vendas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
                  placeholder="Descreva a função do agente..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Agente
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AgentType }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer"
                  >
                    <option value="CHATBOT">Chatbot</option>
                    <option value="AUTOMATION">Automação</option>
                    <option value="ASSISTANT">Assistente</option>
                    <option value="SCHEDULER">Agendador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template (opcional)
                  </label>
                  <select
                    value={formData.templateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer"
                  >
                    <option value="">Sem template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* AI Configuration */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span style={{fontSize:"14px"}}>⚙</span>
              Configuração de IA
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer"
                  >
                    <option value="OPENAI">OpenAI</option>
                    <option value="GEMINI">Google Gemini</option>
                    <option value="DEEPSEEK">DeepSeek</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo
                  </label>
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer"
                  >
                    {MODELS[formData.provider].map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Prompt *
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={8}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none font-mono text-sm"
                  placeholder="Defina o comportamento do agente..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use variáveis como {'{nome}'}, {'{email}'} para personalização dinâmica.
                </p>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span style={{fontSize:"14px"}}>⬌</span>
                Configurações Avançadas
              </h2>
              <span style={{fontSize:"14px"}}>▶</span>
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperatura: {formData.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Mais preciso</span>
                    <span>Mais criativo</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens: {formData.maxTokens}
                  </label>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="256"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Respostas curtas</span>
                    <span>Respostas longas</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Voice Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span style={{fontSize:"14px"}}>🎤</span>
                Configurações de Voz
                {formData.voiceEnabled && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-cyan-100 text-cyan-700 rounded-full">
                    Ativado
                  </span>
                )}
              </h2>
              <span style={{fontSize:"14px"}}>▶</span>
            </button>

            {showVoiceSettings && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                {/* Voice Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-medium text-gray-900">Respostas por Áudio</h3>
                    <p className="text-sm text-gray-500">
                      O agente responderá com mensagens de voz no WhatsApp
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.voiceEnabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, voiceEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>

                {formData.voiceEnabled && (
                  <>
                    {/* Voice Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Selecionar Voz
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {VOICES.map((voice) => (
                          <button
                            key={voice.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, voiceId: voice.value }))}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              formData.voiceId === voice.value
                                ? 'border-violet-500 bg-violet-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span style={{fontSize:"14px"}}>🔊</span>
                              <span className="font-medium text-gray-900">{voice.label}</span>
                            </div>
                            <p className="text-xs text-gray-500">{voice.description}</p>
                            <span className="text-xs text-gray-400 mt-1 block">{voice.gender}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice Speed */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Velocidade da Fala: {formData.voiceSpeed.toFixed(1)}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={formData.voiceSpeed}
                        onChange={(e) => setFormData(prev => ({ ...prev, voiceSpeed: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Mais lento (0.5x)</span>
                        <span>Normal (1.0x)</span>
                        <span>Mais rápido (2.0x)</span>
                      </div>
                    </div>

                    {/* Voice Model */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modelo de Voz
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, voiceModel: 'tts-1' }))}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            formData.voiceModel === 'tts-1'
                              ? 'border-violet-500 bg-violet-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="font-medium text-gray-900">Padrão</span>
                          <p className="text-xs text-gray-500 mt-1">Mais rápido, menor custo</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, voiceModel: 'tts-1-hd' }))}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            formData.voiceModel === 'tts-1-hd'
                              ? 'border-violet-500 bg-violet-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="font-medium text-gray-900">HD</span>
                          <p className="text-xs text-gray-500 mt-1">Maior qualidade de áudio</p>
                        </button>
                      </div>
                    </div>

                    {/* Info box */}
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-sm text-blue-700">
                        <strong>Nota:</strong> Quando ativado, o agente:
                      </p>
                      <ul className="text-sm text-blue-600 mt-2 space-y-1 list-disc list-inside">
                        <li>Transcreverá automaticamente áudios recebidos dos clientes</li>
                        <li>Responderá com mensagens de voz no WhatsApp</li>
                        <li>Utilizará a API OpenAI para síntese de voz (TTS)</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Base de Conhecimento (RAG) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span style={{fontSize:"14px"}}>🗄</span>
              Base de Conhecimento (RAG)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Conecte uma base de conhecimento para o agente consultar documentos antes de responder.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Habilitar RAG
                </label>
                <button
                  type="button"
                  onClick={() => setRagEnabled(!ragEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${ragEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${ragEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {ragEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bases de Conhecimento
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Selecione uma ou mais bases para o agente consultar.
                    </p>
                    {knowledgeBases.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-900">
                        {knowledgeBases.map((kb: any) => {
                          const isSelected = knowledgeBaseIds.includes(kb.id);
                          return (
                            <label
                              key={kb.id}
                              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setKnowledgeBaseIds(prev =>
                                    isSelected
                                      ? prev.filter(id => id !== kb.id)
                                      : [...prev, kb.id]
                                  );
                                }}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                                  {kb.name}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {kb.totalDocuments || kb._count?.documents || 0} docs, {kb.totalChunks || 0} chunks
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">
                        Nenhuma base encontrada.{' '}
                        <a href="/dashboard/ai-agents/conhecimento" className="text-indigo-600 hover:underline">
                          Criar uma base
                        </a>
                      </p>
                    )}
                    {knowledgeBaseIds.length > 0 && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                        {knowledgeBaseIds.length} base{knowledgeBaseIds.length > 1 ? 's' : ''} selecionada{knowledgeBaseIds.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Chunks recuperados (Top K): {ragTopK}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={ragTopK}
                      onChange={(e) => setRagTopK(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>1</span>
                      <span>20</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Threshold de similaridade: {ragThreshold.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={ragThreshold * 100}
                      onChange={(e) => setRagThreshold(Number(e.target.value) / 100)}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0.00</span>
                      <span>1.00</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors"
            >
              <LuTrash className="w-5 h-5" />
              Excluir Agente
            </button>

            <div className="flex-1" />

            <Link
              href="/dashboard/ai-agents/agents"
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
