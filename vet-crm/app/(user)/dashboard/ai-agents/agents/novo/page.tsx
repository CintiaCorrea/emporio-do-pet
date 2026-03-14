'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LuChevronRight,
  LuBot,
  LuArrowLeft,
  LuLoader,
  LuSave,
  LuMessageSquare,
  LuZap,
  LuClock,
  LuSparkles,
  LuVolume2,
  LuInfo,
  LuUsers,
  LuUserPlus,
  LuTarget,
  LuTrendingUp,
  LuBell,
  LuCalendar,
  LuDatabase,
} from 'react-icons/lu';
import { SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';

type AgentType = 'CHATBOT' | 'AUTOMATION' | 'ASSISTANT' | 'SCHEDULER';
type AIProvider = 'OPENAI' | 'GEMINI' | 'DEEPSEEK';

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  status: string;
}

interface NewAgentForm {
  name: string;
  description: string;
  type: AgentType;
  provider: AIProvider;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  // WhatsApp
  whatsappEnabled: boolean;
  whatsappAutoReply: boolean;
  whatsappTemplateId?: string;
  whatsappTemplateName?: string;
  whatsappGreeting?: string;
  whatsappOfflineMessage?: string;
  whatsappBusinessHoursOnly: boolean;
  // CRM
  crmEnabled: boolean;
  crmAutoCreateLead: boolean;
  crmAutoUpdateLead: boolean;
  crmLeadScoring: boolean;
  crmNotifyOnHighScore: boolean;
  crmAssignToBoard?: string;
  // Voice
  voiceEnabled: boolean;
  voiceId: string;
  voiceSpeed: number;
  voiceModel: string;
}

const defaultSystemPrompts: Record<AgentType, string> = {
  CHATBOT: `Você é um assistente virtual amigável do Empório do Pet. Seu objetivo é:
- Responder dúvidas sobre produtos e serviços
- Ajudar clientes a encontrar o que precisam
- Fornecer informações sobre horários, localização e contato
- Ser cordial e profissional em todas as interações

Contexto da clínica: {clinic_name}
Cliente: {tutor_name}
Pet: {pet_name} ({pet_species})`,

  AUTOMATION: `Você é um agente de automação do Empório do Pet. Suas responsabilidades:
- Processar e categorizar mensagens recebidas
- Identificar intenções do cliente (agendamento, dúvida, reclamação, etc.)
- Extrair informações relevantes das mensagens
- Responder de forma objetiva e direcionada

Sempre retorne respostas estruturadas quando solicitado.`,

  ASSISTANT: `Você é um assistente pessoal inteligente do Empório do Pet. Você deve:
- Auxiliar a equipe com tarefas do dia a dia
- Responder perguntas sobre procedimentos internos
- Ajudar na tomada de decisões com base em dados
- Fornecer sugestões e recomendações quando apropriado

Seja proativo e útil em suas respostas.`,

  SCHEDULER: `Você é um agente de agendamento do Empório do Pet. Suas funções:
- Gerenciar marcação de consultas e serviços
- Verificar disponibilidade de horários
- Confirmar e lembrar agendamentos
- Reagendar quando necessário

Sempre confirme os detalhes: data, horário, serviço e pet.
Cliente: {tutor_name}
Pet: {pet_name}`,
};

interface AgentTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  systemPrompt: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export default function NovoAgentePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [agentTemplates, setAgentTemplates] = useState<AgentTemplate[]>([]);
  const [loadingAgentTemplates, setLoadingAgentTemplates] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [boards, setBoards] = useState<{id: string; name: string; type: string}[]>([]);
  const [ragEnabled, setRagEnabled] = useState(false);
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('');
  const [ragTopK, setRagTopK] = useState(5);
  const [ragThreshold, setRagThreshold] = useState(0.7);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);
  
  const [form, setForm] = useState<NewAgentForm>({
    name: '',
    description: '',
    type: 'CHATBOT',
    provider: 'OPENAI',
    model: 'gpt-4o-mini',
    systemPrompt: defaultSystemPrompts.CHATBOT,
    temperature: 0.7,
    maxTokens: 4096,
    // WhatsApp
    whatsappEnabled: false,
    whatsappAutoReply: true,
    whatsappGreeting: 'Olá! Sou o assistente virtual do Empório do Pet. Como posso ajudar?',
    whatsappOfflineMessage: 'No momento estamos fora do horário de atendimento. Retornaremos em breve!',
    whatsappBusinessHoursOnly: false,
    // CRM
    crmEnabled: false,
    crmAutoCreateLead: true,
    crmAutoUpdateLead: true,
    crmLeadScoring: false,
    crmNotifyOnHighScore: false,
    // Voice
    voiceEnabled: false,
    voiceId: 'nova',
    voiceSpeed: 1.0,
    voiceModel: 'tts-1',
  });

  useEffect(() => {
    loadTemplates();
    loadBoards();
    loadAgentTemplates();
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      const response = await fetch('/api/knowledge-bases');
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setKnowledgeBases(data);
      } else if (response.ok && data.data) {
        setKnowledgeBases(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar bases de conhecimento:', error);
    }
  };

  const loadAgentTemplates = async () => {
    setLoadingAgentTemplates(true);
    try {
      const response = await fetch('/api/agent-templates?limit=20');
      const data = await response.json();
      if (response.ok && data.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAgentTemplates(data.data.map((t: any) => ({
          ...t,
          systemPrompt: t.content || t.systemPrompt || '',
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar agent templates:', error);
    } finally {
      setLoadingAgentTemplates(false);
    }
  };

  const handleSelectAgentTemplate = (template: AgentTemplate) => {
    setForm(prev => ({
      ...prev,
      name: template.name,
      description: template.description || '',
      systemPrompt: template.systemPrompt,
      provider: (template.provider as AIProvider) || prev.provider,
      model: template.model || prev.model,
      temperature: template.temperature ?? prev.temperature,
      maxTokens: template.maxTokens ?? prev.maxTokens,
    }));
    toast.success(`Template "${template.name}" aplicado`);
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/whatsapp-templates?limit=100');
      const data = await response.json();
      
      if (response.ok && data.templates) {
        const approvedTemplates = data.templates
          .filter((t: WhatsAppTemplate) => t.status === 'APPROVED')
          .map((t: WhatsAppTemplate) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            status: t.status,
          }));
        setTemplates(approvedTemplates);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadBoards = async () => {
    try {
      const response = await fetch('/api/boards');
      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        const leadBoards = data.filter((b: { type: string }) => b.type === 'LEAD' || b.type === 'SALES');
        setBoards(leadBoards.map((b: { id: string; name: string; type: string }) => ({
          id: b.id,
          name: b.name,
          type: b.type,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar boards:', error);
    }
  };

  const handleTypeChange = (type: AgentType) => {
    setForm({
      ...form,
      type,
      systemPrompt: defaultSystemPrompts[type],
    });
  };

  const handleProviderChange = (provider: AIProvider) => {
    let model = form.model;
    
    if (provider === 'OPENAI') {
      model = 'gpt-4o-mini';
    } else if (provider === 'GEMINI') {
      model = 'gemini-1.5-flash';
    } else if (provider === 'DEEPSEEK') {
      model = 'deepseek-chat';
    }
    
    setForm({ ...form, provider, model });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }
    if (!form.systemPrompt.trim()) {
      toast.error('System Prompt é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          knowledgeBaseId: knowledgeBaseId || undefined,
          ragEnabled,
          ragTopK,
          ragThreshold,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar agente');
      }

      toast.success('Agente criado com sucesso!');
      router.push('/dashboard/ai-agents/agents');
    } catch (error) {
      console.error('Erro ao criar agente:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar agente');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: AgentType) => {
    switch (type) {
      case 'CHATBOT': return <LuMessageSquare className="w-5 h-5" />;
      case 'AUTOMATION': return <LuZap className="w-5 h-5" />;
      case 'ASSISTANT': return <LuBot className="w-5 h-5" />;
      case 'SCHEDULER': return <LuClock className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/ai-agents" className="hover:text-gray-700">AI Agents</Link>
          <LuChevronRight className="w-4 h-4" />
          <Link href="/dashboard/ai-agents/agents" className="hover:text-gray-700">Agents</Link>
          <LuChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Novo Agente</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard/ai-agents/agents"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LuArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Criar Novo Agente
            </h1>
            <p className="text-gray-500 mt-1">
              Configure um novo agente de IA para automação
            </p>
          </div>
        </div>

        {/* Agent Templates Gallery */}
        {agentTemplates.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <LuSparkles className="w-5 h-5 text-violet-600" />
              Começar com um Template
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Selecione um template pré-configurado para começar rapidamente ou crie do zero abaixo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agentTemplates.map(tmpl => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectAgentTemplate(tmpl)}
                  className="text-left p-4 border border-gray-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-violet-50 rounded-lg group-hover:bg-violet-100">
                      <LuBot className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{tmpl.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tmpl.description || tmpl.category}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {loadingAgentTemplates && (
          <div className="text-center py-4 mb-8">
            <LuLoader className="w-5 h-5 animate-spin text-violet-600 mx-auto" />
            <p className="text-sm text-gray-500 mt-1">Carregando templates...</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informações Básicas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <LuBot className="w-5 h-5 text-violet-600" />
              Informações Básicas
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Agente *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Assistente de Vendas"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  placeholder="Descreva a função e objetivo do agente..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
                />
              </div>

              {/* Tipo de Agente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Agente
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { type: 'CHATBOT' as AgentType, label: 'Chatbot', desc: 'Atendimento ao cliente' },
                    { type: 'AUTOMATION' as AgentType, label: 'Automação', desc: 'Processos automáticos' },
                    { type: 'ASSISTANT' as AgentType, label: 'Assistente', desc: 'Ajuda interna' },
                    { type: 'SCHEDULER' as AgentType, label: 'Agendador', desc: 'Gestão de agenda' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleTypeChange(item.type)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        form.type === item.type
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`mb-2 ${form.type === item.type ? 'text-violet-600' : 'text-gray-400'}`}>
                        {getTypeIcon(item.type)}
                      </div>
                      <p className={`font-medium ${form.type === item.type ? 'text-violet-900' : 'text-gray-900'}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Configuração de IA */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <LuSparkles className="w-5 h-5 text-violet-600" />
              Configuração de IA
            </h2>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider
                  </label>
                  <select
                    value={form.provider}
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
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer"
                  >
                    {form.provider === 'OPENAI' && (
                      <>
                        <option value="gpt-4o-mini">GPT-4o Mini (Recomendado)</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    )}
                    {form.provider === 'GEMINI' && (
                      <>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recomendado)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-pro">Gemini Pro</option>
                      </>
                    )}
                    {form.provider === 'DEEPSEEK' && (
                      <>
                        <option value="deepseek-chat">DeepSeek Chat (Recomendado)</option>
                        <option value="deepseek-coder">DeepSeek Coder</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperatura: {form.temperature}
                    <span className="text-gray-400 font-normal ml-2">
                      ({form.temperature <= 0.3 ? 'Preciso' : form.temperature <= 0.7 ? 'Balanceado' : 'Criativo'})
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0 (Determinístico)</span>
                    <span>2 (Aleatório)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens
                  </label>
                  <select
                    value={form.maxTokens}
                    onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer"
                  >
                    <option value="1024">1.024 (Respostas curtas)</option>
                    <option value="2048">2.048 (Respostas médias)</option>
                    <option value="4096">4.096 (Padrão)</option>
                    <option value="8192">8.192 (Respostas longas)</option>
                    <option value="16384">16.384 (Muito longas)</option>
                  </select>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Prompt *
                </label>
                <div className="relative">
                  <textarea
                    placeholder="Defina o comportamento e personalidade do agente..."
                    rows={8}
                    value={form.systemPrompt}
                    onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none font-mono text-sm"
                  />
                </div>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg flex gap-2">
                  <LuInfo className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    <strong>Variáveis disponíveis:</strong> {'{clinic_name}'}, {'{tutor_name}'}, {'{pet_name}'}, {'{pet_species}'}, {'{current_date}'}
                    - Serão substituídas automaticamente durante a execução.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Configurações WhatsApp */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <SiWhatsapp className="w-5 h-5 text-green-600" />
                Configurações WhatsApp
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.whatsappEnabled}
                  onChange={(e) => setForm({ ...form, whatsappEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {form.whatsappEnabled ? (
              <div className="space-y-5">
                {/* Opções principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.whatsappAutoReply}
                      onChange={(e) => setForm({ ...form, whatsappAutoReply: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Auto-resposta</p>
                      <p className="text-xs text-gray-500">Responder automaticamente mensagens recebidas</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.whatsappBusinessHoursOnly}
                      onChange={(e) => setForm({ ...form, whatsappBusinessHoursOnly: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                    />
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-900">Horário comercial</p>
                        <p className="text-xs text-gray-500">Responder apenas no horário de funcionamento</p>
                      </div>
                      <LuCalendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </label>
                </div>

                {/* Template WhatsApp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template de Mensagem
                    {loadingTemplates && (
                      <span className="ml-2 text-xs text-gray-400">Carregando...</span>
                    )}
                  </label>
                  <select
                    value={form.whatsappTemplateId || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value || undefined;
                      const selectedTemplate = templates.find(t => t.id === selectedId);
                      setForm({
                        ...form,
                        whatsappTemplateId: selectedId,
                        whatsappTemplateName: selectedTemplate?.name,
                      });
                    }}
                    disabled={loadingTemplates}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Sem template (resposta livre)</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.category})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Associe um template aprovado da Meta para iniciar conversas.{' '}
                    <Link href="/dashboard/ai-agents/templates" className="text-green-600 hover:underline">
                      Gerenciar Templates
                    </Link>
                  </p>
                </div>

                {/* Mensagens */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensagem de Saudação
                    </label>
                    <textarea
                      placeholder="Primeira mensagem ao iniciar conversa..."
                      rows={3}
                      value={form.whatsappGreeting}
                      onChange={(e) => setForm({ ...form, whatsappGreeting: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 resize-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensagem Fora do Horário
                    </label>
                    <textarea
                      placeholder="Mensagem quando fora do expediente..."
                      rows={3}
                      value={form.whatsappOfflineMessage}
                      onChange={(e) => setForm({ ...form, whatsappOfflineMessage: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 resize-none text-sm"
                    />
                  </div>
                </div>

                <div className="p-3 bg-green-50 rounded-lg flex gap-2">
                  <LuInfo className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700">
                    O agente será automaticamente atribuído a novas conversas do WhatsApp quando habilitado.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Habilite para conectar este agente ao WhatsApp Business API e responder mensagens automaticamente.
              </p>
            )}
          </div>

          {/* Configurações CRM */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <LuUsers className="w-5 h-5 text-blue-600" />
                Configurações CRM
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.crmEnabled}
                  onChange={(e) => setForm({ ...form, crmEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {form.crmEnabled ? (
              <div className="space-y-5">
                {/* Opções de Lead */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.crmAutoCreateLead}
                      onChange={(e) => setForm({ ...form, crmAutoCreateLead: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-900">Criar Lead Automático</p>
                        <p className="text-xs text-gray-500">Criar lead quando novo contato iniciar conversa</p>
                      </div>
                      <LuUserPlus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.crmAutoUpdateLead}
                      onChange={(e) => setForm({ ...form, crmAutoUpdateLead: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Atualizar Lead</p>
                      <p className="text-xs text-gray-500">Atualizar dados do lead com informações das conversas</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.crmLeadScoring}
                      onChange={(e) => setForm({ ...form, crmLeadScoring: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-900">Lead Scoring Automático</p>
                        <p className="text-xs text-gray-500">Calcular score do lead baseado nas interações</p>
                      </div>
                      <LuTarget className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.crmNotifyOnHighScore}
                      onChange={(e) => setForm({ ...form, crmNotifyOnHighScore: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-900">Notificar Lead Quente</p>
                        <p className="text-xs text-gray-500">Alertar equipe quando lead atingir score alto</p>
                      </div>
                      <LuBell className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </label>
                </div>

                {/* Board de destino */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mover para Board
                  </label>
                  <select
                    value={form.crmAssignToBoard || ''}
                    onChange={(e) => setForm({ ...form, crmAssignToBoard: e.target.value || undefined })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Não mover automaticamente</option>
                    {boards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Leads criados pelo agente serão adicionados a este board automaticamente.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg flex gap-2">
                  <LuTrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    A integração com CRM permite rastrear conversões e medir o ROI das automações de IA.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Habilite para integrar o agente com o CRM, criar leads automaticamente e acompanhar métricas de conversão.
              </p>
            )}
          </div>

          {/* Configuração de Voz */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <LuVolume2 className="w-5 h-5 text-violet-600" />
                Resposta por Voz (TTS)
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.voiceEnabled}
                  onChange={(e) => setForm({ ...form, voiceEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {form.voiceEnabled ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Voz
                    </label>
                    <select
                      value={form.voiceId}
                      onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer"
                    >
                      <option value="alloy">Alloy (Neutra)</option>
                      <option value="echo">Echo (Masculina)</option>
                      <option value="fable">Fable (Expressiva)</option>
                      <option value="onyx">Onyx (Grave)</option>
                      <option value="nova">Nova (Feminina)</option>
                      <option value="shimmer">Shimmer (Suave)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Velocidade: {form.voiceSpeed}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={form.voiceSpeed}
                      onChange={(e) => setForm({ ...form, voiceSpeed: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600 mt-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualidade
                    </label>
                    <select
                      value={form.voiceModel}
                      onChange={(e) => setForm({ ...form, voiceModel: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer"
                    >
                      <option value="tts-1">Padrão (tts-1)</option>
                      <option value="tts-1-hd">Alta Definição (tts-1-hd)</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Quando habilitado, as respostas do agente serão convertidas em áudio e enviadas como mensagem de voz no WhatsApp.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Habilite para que o agente responda com mensagens de voz no WhatsApp.
              </p>
            )}
          </div>

          {/* Base de Conhecimento (RAG) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LuDatabase className="w-5 h-5 text-indigo-600" />
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
                      Base de Conhecimento
                    </label>
                    <select
                      value={knowledgeBaseId}
                      onChange={(e) => setKnowledgeBaseId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Selecione uma base...</option>
                      {knowledgeBases.map((kb: any) => (
                        <option key={kb.id} value={kb.id}>
                          {kb.name} ({kb.totalDocuments} docs, {kb.totalChunks} chunks)
                        </option>
                      ))}
                    </select>
                    {knowledgeBases.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Nenhuma base encontrada.{' '}
                        <a href="/dashboard/ai-agents/conhecimento" className="text-indigo-600 hover:underline">
                          Criar uma base
                        </a>
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

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/dashboard/ai-agents/agents"
              className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Cancelar
            </Link>
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LuLoader className="w-5 h-5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <LuSave className="w-5 h-5" />
                  Criar Agente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
