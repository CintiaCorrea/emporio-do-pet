'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  LuFileText,
  LuSearch,
  LuPlus
  LuTrash,
  LuCheck,
  LuSparkles,
  LuLoader
  LuPhone
} from 'react-icons/lu';
import { AiOutlineWarning } from 'react-icons/ai';
import { toast } from 'sonner';
import TemplateImportExport from '@/components/protected/ai-agents/TemplateImportExport';

// Tipos para WhatsApp Templates da Meta API
type WhatsAppTemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'IN_APPEAL';
type WhatsAppTemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL' | 'COPY_CODE';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  status: WhatsAppTemplateStatus;
  category: WhatsAppTemplateCategory;
  language: string;
  components: WhatsAppTemplateComponent[];
  quality_score?: {
    score: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    reasons?: string[];
  };
  rejected_reason?: string;
  previous_category?: string;
}

interface TemplatesResponse {
  data: WhatsAppTemplate[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
}

async function readJsonSafe(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getApiErrorMessage(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data?.error === 'string' && data.error) return data.error;
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (Array.isArray(data?.message)) return data.message.filter((x: unknown) => typeof x === 'string').join(', ') || fallback;
  return fallback;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<WhatsAppTemplateCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WhatsAppTemplateStatus | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTemplates = useCallback(async (showRefreshToast = false) => {
    if (showRefreshToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '100');

      const response = await fetch(`/api/whatsapp-templates?${params.toString()}`);
      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Erro ao carregar templates'));
      }

      // A resposta do backend vem com { templates: [...] } ou da Meta API com { data: [...] }
      console.log('WhatsApp Templates API Response:', data);
      const templateList = data?.templates || data?.data || (Array.isArray(data) ? data : []);
      setTemplates(Array.isArray(templateList) ? templateList : []);
      
      // Se há erro, mostrar para o usuário
      if (data?.error) {
        toast.error(`WhatsApp: ${data.error}`);
      }
      
      if (showRefreshToast) {
        toast.success('Templates atualizados!');
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar templates');
      setTemplates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDeleteTemplate = async (templateName: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    setActionLoading(templateName);
    try {
      const response = await fetch(`/api/whatsapp-templates/${templateName}`, {
        method: 'DELETE'});

      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Erro ao excluir template'));
      }

      toast.success('Template excluído com sucesso!');
      setIsModalOpen(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir template');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtros locais (busca por texto)
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Estatísticas
  const stats = {
    total: templates.length,
    approved: templates.filter(t => t.status === 'APPROVED').length,
    pending: templates.filter(t => t.status === 'PENDING').length,
    rejected: templates.filter(t => t.status === 'REJECTED').length,
    greenQuality: templates.filter(t => t.quality_score?.score === 'GREEN').length};

  const getCategoryColor = (category: WhatsAppTemplateCategory) => {
    switch (category) {
      case 'MARKETING': return 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400';
      case 'UTILITY': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'AUTHENTICATION': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    }
  };

  const getCategoryIcon = (category: WhatsAppTemplateCategory) => {
    switch (category) {
      case 'MARKETING': return <LuSparkles className="w-4 h-4" />;
      case 'UTILITY': return <span style={{fontSize:"14px"}}>💬</span>;
      case 'AUTHENTICATION': return <span style={{fontSize:"14px"}}>🛡</span>;
    }
  };

  const getCategoryText = (category: WhatsAppTemplateCategory) => {
    switch (category) {
      case 'MARKETING': return 'Marketing';
      case 'UTILITY': return 'Utilidade';
      case 'AUTHENTICATION': return 'Autenticação';
    }
  };

  const getStatusColor = (status: WhatsAppTemplateStatus) => {
    switch (status) {
      case 'APPROVED': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'PENDING': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'PAUSED': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      case 'DISABLED': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      case 'IN_APPEAL': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    }
  };

  const getStatusText = (status: WhatsAppTemplateStatus) => {
    switch (status) {
      case 'APPROVED': return 'Aprovado';
      case 'PENDING': return 'Pendente';
      case 'REJECTED': return 'Rejeitado';
      case 'PAUSED': return 'Pausado';
      case 'DISABLED': return 'Desativado';
      case 'IN_APPEAL': return 'Em Recurso';
    }
  };

  const getQualityColor = (score?: string) => {
    switch (score) {
      case 'GREEN': return 'text-cyan-500';
      case 'YELLOW': return 'text-orange-500';
      case 'RED': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getLanguageText = (code: string) => {
    const languages: Record<string, string> = {
      'pt_BR': 'Português (BR)',
      'en': 'English',
      'en_US': 'English (US)',
      'es': 'Español',
      'es_ES': 'Español (ES)'};
    return languages[code] || code;
  };

  const getComponentIcon = (type: string, format?: string) => {
    if (type === 'HEADER') {
      switch (format) {
        case 'IMAGE': return <span style={{fontSize:"14px"}}>🖼</span>;
        case 'VIDEO': return <span style={{fontSize:"14px"}}>🎥</span>;
        case 'DOCUMENT': return <span style={{fontSize:"14px"}}>📄</span>;
        default: return <LuFileText className="w-4 h-4" />;
      }
    }
    return <span style={{fontSize:"14px"}}>💬</span>;
  };

  const extractTemplateText = (template: WhatsAppTemplate) => {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    return bodyComponent?.text || '';
  };

  const openTemplateDetails = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Carregando templates da Meta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
            
        {/* Breadcrumb e Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/dashboard/ai-agents/agents" className="hover:text-indigo-600 transition-colors">
              AI Agents
            </Link>
            <span style={{fontSize:"14px"}}>▶</span>
            <span className="text-gray-900 dark:text-white font-medium">Templates</span>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Templates WhatsApp
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Templates aprovados pela Meta para uso no WhatsApp Business API
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => loadTemplates(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all disabled:opacity-50"
              >
                <span style={{fontSize:"14px"}}>↻</span>
                Atualizar
              </button>
              <TemplateImportExport onImportComplete={() => loadTemplates()} />
              <Link
                href="/dashboard/ai-agents/templates/novo"
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:shadow-xl"
              >
                <LuPlus className="w-5 h-5" />
                Novo Template
              </Link>
            </div>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                <LuFileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-900/30">
                <LuCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aprovados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/30">
                <span style={{fontSize:"14px"}}>⏱</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/30">
                <span style={{fontSize:"14px"}}>✕</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rejeitados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejected}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-900/30">
                <span style={{fontSize:"14px"}}>🛡</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Qualidade</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.greenQuality}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1 relative">
              <LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Filtro Categoria */}
            <div className="flex items-center gap-2">
              <span style={{fontSize:"14px"}}>⌕</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as WhatsAppTemplateCategory | 'all')}
                className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">Todas Categorias</option>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utilidade</option>
                <option value="AUTHENTICATION">Autenticação</option>
              </select>
            </div>

            {/* Filtro Status */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as WhatsAppTemplateStatus | 'all')}
                className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">Todos Status</option>
                <option value="APPROVED">Aprovado</option>
                <option value="PENDING">Pendente</option>
                <option value="REJECTED">Rejeitado</option>
                <option value="PAUSED">Pausado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Templates */}
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <LuFileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nenhum template encontrado</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Tente ajustar os filtros para encontrar o template desejado.'
                : 'Configure suas credenciais do WhatsApp Business API em Conexões ou crie um novo template.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => openTemplateDetails(template)}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      template.status === 'APPROVED' ? 'bg-cyan-50 dark:bg-cyan-900/30' :
                      template.status === 'PENDING' ? 'bg-orange-50 dark:bg-orange-900/30' : 
                      template.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-gray-50 dark:bg-gray-800'
                    }`}>
                      <span style={{fontSize:"14px"}}>💬</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{getLanguageText(template.language)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(template.status)}`}>
                    {getStatusText(template.status)}
                  </span>
                </div>

                {/* Preview do conteúdo */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4 max-h-24 overflow-hidden">
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                    {extractTemplateText(template) || 'Sem conteúdo de texto'}
                  </p>
                </div>

                {/* Categoria e qualidade */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}>
                    {getCategoryIcon(template.category)}
                    {getCategoryText(template.category)}
                  </span>
                  {template.quality_score && (
                    <div className="flex items-center gap-1.5">
                      <span style={{fontSize:"14px"}}>🛡</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {template.quality_score.score === 'UNKNOWN' ? '-' : template.quality_score.score}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Template */}
      {isModalOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    selectedTemplate.status === 'APPROVED' ? 'bg-cyan-50 dark:bg-cyan-900/30' :
                    selectedTemplate.status === 'PENDING' ? 'bg-orange-50 dark:bg-orange-900/30' : 
                    selectedTemplate.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <span style={{fontSize:"14px"}}>💬</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTemplate.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(selectedTemplate.category)}`}>
                        {getCategoryIcon(selectedTemplate.category)}
                        {getCategoryText(selectedTemplate.category)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getLanguageText(selectedTemplate.language)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span style={{fontSize:"14px"}}>✕</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status e Qualidade */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(selectedTemplate.status)}`}>
                    {getStatusText(selectedTemplate.status)}
                  </span>
                  {selectedTemplate.quality_score && selectedTemplate.quality_score.score !== 'UNKNOWN' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full">
                      <span style={{fontSize:"14px"}}>🛡</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Qualidade: {selectedTemplate.quality_score.score}
                      </span>
                    </div>
                  )}
                </div>
                {selectedTemplate.status !== 'APPROVED' && (
                  <button 
                    onClick={() => handleDeleteTemplate(selectedTemplate.name)}
                    disabled={actionLoading === selectedTemplate.name}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <LuTrash className="w-4 h-4" />
                    Excluir
                  </button>
                )}
              </div>

              {/* Motivo da rejeição */}
              {selectedTemplate.rejected_reason && selectedTemplate.rejected_reason !== 'NONE' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AiOutlineWarning className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900 dark:text-red-300">Motivo da Rejeição</h4>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        {selectedTemplate.rejected_reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Componentes do Template */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Componentes</h3>
                <div className="space-y-3">
                  {selectedTemplate.components.map((component, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        {getComponentIcon(component.type, component.format)}
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {component.type}
                          {component.format && ` (${component.format})`}
                        </span>
                      </div>
                      {component.text && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {component.text}
                        </p>
                      )}
                      {component.buttons && component.buttons.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {component.buttons.map((button, btnIndex) => (
                            <div 
                              key={btnIndex} 
                              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              {button.type === 'PHONE_NUMBER' && <LuPhone className="w-4 h-4 text-gray-500" />}
                              {button.type === 'URL' && <span style={{fontSize:"14px"}}>↗</span>}
                              {button.type === 'QUICK_REPLY' && <span style={{fontSize:"14px"}}>💬</span>}
                              <span className="text-sm text-gray-700 dark:text-gray-300">{button.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ID do Template</h3>
                  <p className="text-gray-900 dark:text-white font-mono text-sm">{selectedTemplate.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Idioma</h3>
                  <p className="text-gray-900 dark:text-white">{getLanguageText(selectedTemplate.language)}</p>
                </div>
              </div>

              {/* Botão de usar */}
              {selectedTemplate.status === 'APPROVED' && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Link 
                    href={`/dashboard/ai-agents/agents?whatsappTemplate=${selectedTemplate.name}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all"
                  >
                    <span style={{fontSize:"14px"}}>🤖</span>
                    Usar com Agente de IA
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
