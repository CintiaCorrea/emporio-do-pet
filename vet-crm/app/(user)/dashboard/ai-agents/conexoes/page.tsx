'use client';

// Página de Integrações - AI Agents
import { useState, useEffect } from 'react';
import { 
  LuSettings,
  LuCheck,
  LuX,
  LuRefreshCw,
  LuEye,
  LuEyeOff,
  LuCopy,
  LuExternalLink,
  LuCircleCheck,
  LuCircleAlert,
  LuCircle,
  LuMessageSquare,
  LuBrain,
  LuSparkles,
  LuZap,
  LuSave,
  LuTestTube,
  LuTrash2,
  LuInfo,
  LuChevronRight
} from 'react-icons/lu';
import Link from 'next/link';

// Tipos para as integrações
type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'testing';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  status: IntegrationStatus;
  apiKey?: string;
  webhookUrl?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  model?: string;
  lastSync?: string;
  usageCount?: number;
  docsUrl: string;
}

interface IntegrationConfig {
  whatsapp: {
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
    webhookVerifyToken: string;
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  gemini: {
    apiKey: string;
    model: string;
  };
  deepseek: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
}

const defaultConfig: IntegrationConfig = {
  whatsapp: {
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: ''
  },
  openai: {
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4096
  },
  gemini: {
    apiKey: '',
    model: 'gemini-pro'
  },
  deepseek: {
    apiKey: '',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com'
  }
};

export default function IntegracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [config, setConfig] = useState<IntegrationConfig>(defaultConfig);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('whatsapp');
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'whatsapp',
      name: 'WhatsApp Business API',
      description: 'API oficial do WhatsApp para envio de mensagens, notificações e atendimento automatizado',
      icon: <LuMessageSquare className="w-6 h-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      status: 'disconnected',
      docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-4, GPT-3.5 Turbo e outros modelos para geração de texto e análise',
      icon: <LuBrain className="w-6 h-6" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      status: 'disconnected',
      docsUrl: 'https://platform.openai.com/docs'
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Modelo multimodal do Google para processamento de texto, imagens e código',
      icon: <LuSparkles className="w-6 h-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      status: 'disconnected',
      docsUrl: 'https://ai.google.dev/docs'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      description: 'Modelo de IA avançado com excelente custo-benefício para chat e código',
      icon: <LuZap className="w-6 h-6" />,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      status: 'disconnected',
      docsUrl: 'https://platform.deepseek.com/docs'
    }
  ]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/config');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          updateIntegrationStatuses(data.config);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateIntegrationStatuses = (cfg: IntegrationConfig) => {
    setIntegrations(prev => prev.map(integration => {
      let status: IntegrationStatus = 'disconnected';
      
      switch (integration.id) {
        case 'whatsapp':
          if (cfg.whatsapp.accessToken && cfg.whatsapp.phoneNumberId) {
            status = 'connected';
          }
          break;
        case 'openai':
          if (cfg.openai.apiKey) {
            status = 'connected';
          }
          break;
        case 'gemini':
          if (cfg.gemini.apiKey) {
            status = 'connected';
          }
          break;
        case 'deepseek':
          if (cfg.deepseek.apiKey) {
            status = 'connected';
          }
          break;
      }
      
      return { ...integration, status };
    }));
  };

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSave = async (integrationId: string) => {
    setSaving(integrationId);
    setTestResults(prev => ({ ...prev, [integrationId]: null }));
    
    try {
      const response = await fetch('/api/integrations/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, config: config[integrationId as keyof IntegrationConfig] })
      });

      if (response.ok) {
        updateIntegrationStatuses(config);
        setTestResults(prev => ({ 
          ...prev, 
          [integrationId]: { success: true, message: 'Configurações salvas com sucesso!' } 
        }));
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [integrationId]: { success: false, message: 'Erro ao salvar configurações' } 
      }));
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (integrationId: string) => {
    setTesting(integrationId);
    setTestResults(prev => ({ ...prev, [integrationId]: null }));

    try {
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, config: config[integrationId as keyof IntegrationConfig] })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIntegrations(prev => prev.map(i => 
          i.id === integrationId ? { ...i, status: 'connected' } : i
        ));
        setTestResults(prev => ({ 
          ...prev, 
          [integrationId]: { success: true, message: result.message || 'Conexão estabelecida com sucesso!' } 
        }));
      } else {
        setIntegrations(prev => prev.map(i => 
          i.id === integrationId ? { ...i, status: 'error' } : i
        ));
        setTestResults(prev => ({ 
          ...prev, 
          [integrationId]: { success: false, message: result.message || 'Falha na conexão' } 
        }));
      }
    } catch (error) {
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId ? { ...i, status: 'error' } : i
      ));
      setTestResults(prev => ({ 
        ...prev, 
        [integrationId]: { success: false, message: 'Erro ao testar conexão' } 
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta integração?')) return;

    try {
      const response = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId })
      });

      if (response.ok) {
        // Limpar configuração local
        setConfig(prev => ({
          ...prev,
          [integrationId]: defaultConfig[integrationId as keyof IntegrationConfig]
        }));
        setIntegrations(prev => prev.map(i => 
          i.id === integrationId ? { ...i, status: 'disconnected' } : i
        ));
        setTestResults(prev => ({ ...prev, [integrationId]: null }));
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  };

  const getStatusIcon = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected': return <LuCircleCheck className="w-5 h-5 text-green-500" />;
      case 'error': return <LuCircleAlert className="w-5 h-5 text-red-500" />;
      case 'testing': return <LuRefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <LuCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'error': return 'Erro';
      case 'testing': return 'Testando...';
      default: return 'Desconectado';
    }
  };

  const getStatusColor = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-700';
      case 'error': return 'bg-red-100 text-red-700';
      case 'testing': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Webhook URL aponta para a rota do Next.js que faz proxy ao backend
  // Em produção: https://app.emporiodopet.com.br/webhooks/whatsapp
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/webhooks/whatsapp`
    : 'https://app.emporiodopet.com.br/webhooks/whatsapp';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando integrações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
            
            {/* Breadcrumb e Header */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-4">
                <Link href="/dashboard/ai-agents/agents" className="hover:text-blue-600 transition-colors">
                  AI Agents
                </Link>
                <LuChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">Integrações</span>
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Integrações
                  </h1>
                  <p className="text-gray-500 mt-1">
                    Configure suas APIs e serviços externos
                  </p>
                </div>
                <button 
                  onClick={loadConfig}
                  className="flex w-full sm:w-auto justify-center sm:justify-start items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  <LuRefreshCw className="w-5 h-5" />
                  Atualizar
                </button>
              </div>
            </div>

            {/* Cards de Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {integrations.map((integration) => (
                <button
                  key={integration.id}
                  onClick={() => setActiveTab(integration.id)}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 text-left transition-all hover:shadow-lg ${
                    activeTab === integration.id 
                      ? 'border-blue-500 ring-2 ring-blue-500/20' 
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${integration.bgColor}`}>
                      <span className={integration.color}>{integration.icon}</span>
                    </div>
                    {getStatusIcon(integration.status)}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{integration.name}</h3>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(integration.status)}`}>
                    {getStatusText(integration.status)}
                  </span>
                </button>
              ))}
            </div>

            {/* Configuração da Integração Selecionada */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* WhatsApp Business API */}
              {activeTab === 'whatsapp' && (
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-green-50">
                      <LuMessageSquare className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">WhatsApp Business API</h2>
                      <p className="text-gray-500">API oficial do Meta para WhatsApp Business</p>
                    </div>
                    <a 
                      href="https://developers.facebook.com/docs/whatsapp/cloud-api" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 md:self-auto self-start"
                    >
                      <LuExternalLink className="w-4 h-4" />
                      Documentação
                    </a>
                  </div>

                  <div className="space-y-6">
                    {/* Webhook URL */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-start gap-3">
                        <LuInfo className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-blue-900 mb-1">Configuração do Webhook</h4>
                          <p className="text-sm text-blue-700 mb-3">Configure estas informações no painel Meta Business → WhatsApp → Configuração</p>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-blue-600 font-medium mb-1">URL do Webhook (Callback URL):</p>
                              <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <code className="w-full sm:flex-1 px-3 py-2 bg-white rounded-lg text-sm font-mono text-gray-800 border border-blue-200 break-all">
                                  {webhookUrl}
                                </code>
                                <button 
                                  onClick={() => copyToClipboard(webhookUrl)}
                                  className="w-full md:w-auto inline-flex justify-center p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Copiar"
                                >
                                  <LuCopy className="w-4 h-4 text-blue-600" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t border-blue-200">
                              <p className="text-xs text-blue-600 font-medium mb-1">Campos para assinar (Webhook Fields):</p>
                              <code className="px-3 py-2 bg-white rounded-lg text-sm font-mono text-gray-800 border border-blue-200 inline-block">
                                messages
                              </code>
                            </div>
                          </div>
                          
                          <p className="text-xs text-blue-600 mt-3">
                            <strong>Nota:</strong> Para desenvolvimento local, use ngrok: <code className="bg-white px-1 rounded">ngrok http 3001</code>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Phone Number ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        value={config.whatsapp.phoneNumberId}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, phoneNumberId: e.target.value }
                        }))}
                        placeholder="Ex: 123456789012345"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Encontre no Meta Business Suite → WhatsApp → Configurações da API</p>
                    </div>

                    {/* Business Account ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Account ID
                      </label>
                      <input
                        type="text"
                        value={config.whatsapp.businessAccountId}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, businessAccountId: e.target.value }
                        }))}
                        placeholder="Ex: 123456789012345"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Encontre no Meta Business Suite → Configurações → Informações da conta comercial</p>
                    </div>

                    {/* Access Token */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Access Token (Permanente)
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys['whatsapp-token'] ? 'text' : 'password'}
                          value={config.whatsapp.accessToken}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            whatsapp: { ...prev.whatsapp, accessToken: e.target.value }
                          }))}
                          placeholder="EAAxxxxxxxxxxxxxxx..."
                          className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey('whatsapp-token')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                        >
                          {showKeys['whatsapp-token'] ? <LuEyeOff className="w-5 h-5 text-gray-500" /> : <LuEye className="w-5 h-5 text-gray-500" />}
                        </button>
                      </div>
                    </div>

                    {/* Webhook Verify Token */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook Verify Token
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={config.whatsapp.webhookVerifyToken}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            whatsapp: { ...prev.whatsapp, webhookVerifyToken: e.target.value }
                          }))}
                          placeholder="Ex: meu_token_secreto_123"
                          className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(config.whatsapp.webhookVerifyToken)}
                          disabled={!config.whatsapp.webhookVerifyToken}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                          title="Copiar para usar no Meta"
                        >
                          <LuCopy className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Crie um token secreto aqui e use o <strong>mesmo valor</strong> no campo "Verify Token" ao configurar o webhook no Meta Developer Portal
                      </p>
                    </div>

                    {/* Test Result */}
                    {testResults['whatsapp'] && (
                      <div className={`p-4 rounded-xl ${testResults['whatsapp'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2">
                          {testResults['whatsapp'].success ? (
                            <LuCircleCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <LuCircleAlert className="w-5 h-5 text-red-600" />
                          )}
                          <span className={testResults['whatsapp'].success ? 'text-green-700' : 'text-red-700'}>
                            {testResults['whatsapp'].message}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleTest('whatsapp')}
                        disabled={testing === 'whatsapp' || !config.whatsapp.accessToken}
                        className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testing === 'whatsapp' ? (
                          <LuRefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LuTestTube className="w-4 h-4" />
                        )}
                        Testar Conexão
                      </button>
                      <button
                        onClick={() => handleSave('whatsapp')}
                        disabled={saving === 'whatsapp'}
                        className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                      >
                        {saving === 'whatsapp' ? (
                          <LuRefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LuSave className="w-4 h-4" />
                        )}
                        Salvar
                      </button>
                      {integrations.find(i => i.id === 'whatsapp')?.status === 'connected' && (
                        <button
                          onClick={() => handleDisconnect('whatsapp')}
                          className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors md:ml-auto"
                        >
                          <LuTrash2 className="w-4 h-4" />
                          Desconectar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* OpenAI */}
              {activeTab === 'openai' && (
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-emerald-50">
                      <LuBrain className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">OpenAI</h2>
                      <p className="text-gray-500">GPT-4, GPT-3.5 Turbo e outros modelos</p>
                    </div>
                    <a 
                      href="https://platform.openai.com/docs" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 md:self-auto self-start"
                    >
                      <LuExternalLink className="w-4 h-4" />
                      Documentação
                    </a>
                  </div>

                  <div className="space-y-6">
                    {/* API Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys['openai-key'] ? 'text' : 'password'}
                          value={config.openai.apiKey}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            openai: { ...prev.openai, apiKey: e.target.value }
                          }))}
                          placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey('openai-key')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                        >
                          {showKeys['openai-key'] ? <LuEyeOff className="w-5 h-5 text-gray-500" /> : <LuEye className="w-5 h-5 text-gray-500" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Obtenha sua chave em platform.openai.com/api-keys</p>
                    </div>

                    {/* Model */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modelo Padrão
                      </label>
                      <select
                        value={config.openai.model}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          openai: { ...prev.openai, model: e.target.value }
                        }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="gpt-4-turbo-preview">GPT-4 Turbo (Recomendado)</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                      </select>
                    </div>

                    {/* Max Tokens */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Máximo de Tokens
                      </label>
                      <input
                        type="number"
                        value={config.openai.maxTokens}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          openai: { ...prev.openai, maxTokens: parseInt(e.target.value) || 4096 }
                        }))}
                        min="100"
                        max="128000"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    {/* Test Result */}
                    {testResults['openai'] && (
                      <div className={`p-4 rounded-xl ${testResults['openai'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2">
                          {testResults['openai'].success ? (
                            <LuCircleCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <LuCircleAlert className="w-5 h-5 text-red-600" />
                          )}
                          <span className={testResults['openai'].success ? 'text-green-700' : 'text-red-700'}>
                            {testResults['openai'].message}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleTest('openai')}
                        disabled={testing === 'openai' || !config.openai.apiKey}
                        className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testing === 'openai' ? (
                          <LuRefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LuTestTube className="w-4 h-4" />
                        )}
                        Testar Conexão
                      </button>
                      <button
                        onClick={() => handleSave('openai')}
                        disabled={saving === 'openai'}
                        className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                      >
                        {saving === 'openai' ? (
                          <LuRefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LuSave className="w-4 h-4" />
                        )}
                        Salvar
                      </button>
                      {integrations.find(i => i.id === 'openai')?.status === 'connected' && (
                        <button
                          onClick={() => handleDisconnect('openai')}
                          className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors md:ml-auto"
                        >
                          <LuTrash2 className="w-4 h-4" />
                          Desconectar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Gemini */}
              {activeTab === 'gemini' && (
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-blue-50">
                      <LuSparkles className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">Google Gemini</h2>
                      <p className="text-gray-500">Modelo multimodal do Google AI</p>
                    </div>
                    <a 
                      href="https://ai.google.dev/docs" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 md:self-auto self-start"
                    >
                      <LuExternalLink className="w-4 h-4" />
                      Documentação
                    </a>
                  </div>

                  <div className="space-y-6">
                    {/* API Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys['gemini-key'] ? 'text' : 'password'}
                          value={config.gemini.apiKey}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            gemini: { ...prev.gemini, apiKey: e.target.value }
                          }))}
                          placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey('gemini-key')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                        >
                          {showKeys['gemini-key'] ? <LuEyeOff className="w-5 h-5 text-gray-500" /> : <LuEye className="w-5 h-5 text-gray-500" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Obtenha sua chave em aistudio.google.com/apikey</p>
                    </div>

                    {/* Model */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modelo
                      </label>
                      <select
                        value={config.gemini.model}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          gemini: { ...prev.gemini, model: e.target.value }
                        }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="gemini-pro">Gemini Pro</option>
                        <option value="gemini-pro-vision">Gemini Pro Vision</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      </select>
                    </div>

                    {/* Test Result */}
                    {testResults['gemini'] && (
                      <div className={`p-4 rounded-xl ${testResults['gemini'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2">
                          {testResults['gemini'].success ? (
                            <LuCircleCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <LuCircleAlert className="w-5 h-5 text-red-600" />
                          )}
                          <span className={testResults['gemini'].success ? 'text-green-700' : 'text-red-700'}>
                            {testResults['gemini'].message}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleTest('gemini')}
                        disabled={testing === 'gemini' || !config.gemini.apiKey}
                        className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testing === 'gemini' ? (
                          <LuRefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LuTestTube className="w-4 h-4" />
                        )}
                        Testar Conexão
                      </button>
                      <button
                        onClick={() => handleSave('gemini')}
                        disabled={saving === 'gemini'}
                        className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                      >
                        {saving === 'gemini' ? (
                          <LuRefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LuSave className="w-4 h-4" />
                        )}
                        Salvar
                      </button>
                      {integrations.find(i => i.id === 'gemini')?.status === 'connected' && (
                        <button
                          onClick={() => handleDisconnect('gemini')}
                          className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors md:ml-auto"
                        >
                          <LuTrash2 className="w-4 h-4" />
                          Desconectar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* DeepSeek */}
              {activeTab === 'deepseek' && (
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-violet-50">
                      <LuZap className="w-6 h-6 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">DeepSeek</h2>
                      <p className="text-gray-500">IA avançada com excelente custo-benefício</p>
                    </div>
                    <a 
                      href="https://platform.deepseek.com/docs" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 md:self-auto self-start"
                    >
                      <LuExternalLink className="w-4 h-4" />
                      Documentação
                    </a>
                  </div>

                  <div className="space-y-6">
                    {/* API Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys['deepseek-key'] ? 'text' : 'password'}
                          value={config.deepseek.apiKey}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            deepseek: { ...prev.deepseek, apiKey: e.target.value }
                          }))}
                          placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey('deepseek-key')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                        >
                          {showKeys['deepseek-key'] ? <LuEyeOff className="w-5 h-5 text-gray-500" /> : <LuEye className="w-5 h-5 text-gray-500" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Obtenha sua chave em platform.deepseek.com</p>
                    </div>

                    {/* Model */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modelo
                      </label>
                      <select
                        value={config.deepseek.model}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          deepseek: { ...prev.deepseek, model: e.target.value }
                        }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 cursor-pointer"
                      >
                        <option value="deepseek-chat">DeepSeek Chat</option>
                        <option value="deepseek-coder">DeepSeek Coder</option>
                      </select>
                    </div>

                    {/* Base URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base URL
                      </label>
                      <input
                        type="text"
                        value={config.deepseek.baseUrl}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          deepseek: { ...prev.deepseek, baseUrl: e.target.value }
                        }))}
                        placeholder="https://api.deepseek.com"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                      />
                    </div>

                    {/* Test Result */}
                    {testResults['deepseek'] && (
                      <div className={`p-4 rounded-xl ${testResults['deepseek'].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2">
                          {testResults['deepseek'].success ? (
                            <LuCircleCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <LuCircleAlert className="w-5 h-5 text-red-600" />
                          )}
                          <span className={testResults['deepseek'].success ? 'text-green-700' : 'text-red-700'}>
                            {testResults['deepseek'].message}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleTest('deepseek')}
                        disabled={testing === 'deepseek' || !config.deepseek.apiKey}
                        className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testing === 'deepseek' ? (
                          <LuRefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LuTestTube className="w-4 h-4" />
                        )}
                        Testar Conexão
                      </button>
                      <button
                        onClick={() => handleSave('deepseek')}
                        disabled={saving === 'deepseek'}
                        className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                      >
                        {saving === 'deepseek' ? (
                          <LuRefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LuSave className="w-4 h-4" />
                        )}
                        Salvar
                      </button>
                      {integrations.find(i => i.id === 'deepseek')?.status === 'connected' && (
                        <button
                          onClick={() => handleDisconnect('deepseek')}
                          className="flex w-full md:w-auto justify-center md:justify-start items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors md:ml-auto"
                        >
                          <LuTrash2 className="w-4 h-4" />
                          Desconectar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Usage Section */}
          <AiUsageSection />
        </div>
  );
}

function AiUsageSection() {
  const [usage, setUsage] = useState<{
    monthlyBudget: number | null;
    currentMonthCost: number;
    budgetUsedPercent: string | null;
    totalCostAllTime: number;
    totalInteractions: number;
    agentBreakdown: Array<{ id: string; name: string; cost: number; interactions: number }>;
  } | null>(null);
  const [pricing, setPricing] = useState<{
    models: Record<string, unknown>;
    tts: Record<string, unknown>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usageRes, pricingRes] = await Promise.all([
          fetch('/api/agents/usage'),
          fetch('/api/agents/pricing'),
        ]);
        if (usageRes.ok) setUsage(await usageRes.json());
        if (pricingRes.ok) setPricing(await pricingRes.json());
      } catch (err) {
        console.error('Error loading usage/pricing:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <LuRefreshCw className="w-6 h-6 animate-spin text-violet-600 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Carregando dados de uso...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <LuInfo className="w-5 h-5 text-violet-600" />
        Uso de IA e Custos
      </h2>

      {usage && (
        <>
          {/* Usage Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Custo este Mês</p>
              <p className="text-2xl font-bold text-gray-900">${usage.currentMonthCost.toFixed(4)}</p>
              {usage.monthlyBudget && (
                <div className="mt-2">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        Number(usage.budgetUsedPercent) > 80 ? 'bg-red-500' :
                        Number(usage.budgetUsedPercent) > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(Number(usage.budgetUsedPercent), 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{usage.budgetUsedPercent}% de ${usage.monthlyBudget.toFixed(2)}</p>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Custo Total (All-Time)</p>
              <p className="text-2xl font-bold text-gray-900">${usage.totalCostAllTime.toFixed(4)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Total Interações</p>
              <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('pt-BR').format(usage.totalInteractions)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Orçamento Mensal</p>
              <p className="text-2xl font-bold text-gray-900">
                {usage.monthlyBudget ? `$${usage.monthlyBudget.toFixed(2)}` : 'Sem limite'}
              </p>
            </div>
          </div>

          {/* Agent Breakdown */}
          {usage.agentBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Custo por Agente</h3>
              <div className="space-y-3">
                {usage.agentBreakdown.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.interactions} interações</p>
                    </div>
                    <span className="font-semibold text-gray-900">${agent.cost.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Pricing Table */}
      {pricing?.models && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Tabela de Preços por Modelo</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Modelo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Prompt ($/1K tokens)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Completion ($/1K tokens)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Object.entries(pricing.models).map(([model, info]) => {
                  const p = info as { promptCostPer1K?: number; completionCostPer1K?: number };
                  return (
                    <tr key={model} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{model}</td>
                      <td className="px-4 py-3 text-gray-600">${p.promptCostPer1K?.toFixed(6) ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">${p.completionCostPer1K?.toFixed(6) ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
