'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LuPlus,
  LuSearch,
  LuFilter,
  LuRefreshCw,
  LuChevronRight,
  LuMessageSquare,
  LuCheck,
  LuClock,
  LuX,
  LuPause,
  LuCircleAlert,
  LuTrash2,
  LuExternalLink,
  LuCopy,
  LuEye,
} from 'react-icons/lu';
import { toast } from 'sonner';

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<{
    type: string;
    text?: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  quality_score?: {
    score: string;
    date: string;
  };
  rejected_reason?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  APPROVED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: <LuCheck className="w-4 h-4" />,
  },
  PENDING: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: <LuClock className="w-4 h-4" />,
  },
  REJECTED: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: <LuX className="w-4 h-4" />,
  },
  PAUSED: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    icon: <LuPause className="w-4 h-4" />,
  },
  DISABLED: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    icon: <LuCircleAlert className="w-4 h-4" />,
  },
  IN_APPEAL: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: <LuClock className="w-4 h-4" />,
  },
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Aprovado',
  PENDING: 'Pendente',
  REJECTED: 'Rejeitado',
  PAUSED: 'Pausado',
  DISABLED: 'Desativado',
  IN_APPEAL: 'Em Recurso',
};

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
};

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/whatsapp-templates?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar templates');
      }

      if (data.error) {
        setError(data.error);
        setTemplates([]);
      } else {
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [statusFilter, categoryFilter]);

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/whatsapp-templates/${selectedTemplate.name}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao excluir template');
      }

      toast.success('Template excluído com sucesso');
      setShowDeleteModal(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error('Erro ao excluir template:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir template');
    } finally {
      setDeleting(false);
    }
  };

  const copyTemplateName = (name: string) => {
    navigator.clipboard.writeText(name);
    toast.success('Nome do template copiado!');
  };

  const getTemplateBody = (template: WhatsAppTemplate): string => {
    const bodyComponent = template.components.find((c) => c.type === 'BODY');
    return bodyComponent?.text || '';
  };

  const getTemplateHeader = (template: WhatsAppTemplate): string | null => {
    const headerComponent = template.components.find((c) => c.type === 'HEADER');
    return headerComponent?.text || null;
  };

  const getTemplateFooter = (template: WhatsAppTemplate): string | null => {
    const footerComponent = template.components.find((c) => c.type === 'FOOTER');
    return footerComponent?.text || null;
  };

  const filteredTemplates = templates.filter((template) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        template.name.toLowerCase().includes(searchLower) ||
        getTemplateBody(template).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: templates.length,
    approved: templates.filter((t) => t.status === 'APPROVED').length,
    pending: templates.filter((t) => t.status === 'PENDING').length,
    rejected: templates.filter((t) => t.status === 'REJECTED').length,
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/campanhas" className="hover:text-emerald-600">
            Campanhas
          </Link>
          <LuChevronRight className="w-4 h-4" />
          <Link href="/dashboard/campanhas/whatsapp" className="hover:text-emerald-600">
            WhatsApp
          </Link>
          <LuChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Templates</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Templates de Mensagens</h1>
            <p className="text-gray-500 mt-1">
              Gerencie seus templates de mensagens do WhatsApp Business
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTemplates}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              <LuRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>

            <Link
              href="/dashboard/campanhas/whatsapp/templates/novo"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-all"
            >
              <LuPlus className="w-5 h-5" />
              Novo Template
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <LuMessageSquare className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <LuCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                <p className="text-sm text-gray-500">Aprovados</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <LuClock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pendentes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <LuX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-sm text-gray-500">Rejeitados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou conteúdo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Todos os Status</option>
                <option value="APPROVED">Aprovados</option>
                <option value="PENDING">Pendentes</option>
                <option value="REJECTED">Rejeitados</option>
                <option value="PAUSED">Pausados</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Todas as Categorias</option>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utilidade</option>
                <option value="AUTHENTICATION">Autenticação</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <LuCircleAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">Erro ao carregar templates</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <p className="text-sm text-red-600 mt-2">
                  Verifique se você configurou as credenciais do WhatsApp Business API nas
                  configurações de integração.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium">Carregando templates...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredTemplates.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LuMessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {search || statusFilter || categoryFilter
                ? 'Nenhum template encontrado'
                : 'Nenhum template criado'}
            </h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter || categoryFilter
                ? 'Tente ajustar os filtros de busca'
                : 'Crie seu primeiro template de mensagem para usar em campanhas'}
            </p>
            {!search && !statusFilter && !categoryFilter && (
              <Link
                href="/dashboard/campanhas/whatsapp/templates/novo"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                <LuPlus className="w-5 h-5" />
                Criar Template
              </Link>
            )}
          </div>
        )}

        {/* Templates Grid */}
        {!loading && !error && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => {
              const statusStyle = STATUS_COLORS[template.status] || STATUS_COLORS.DISABLED;
              const body = getTemplateBody(template);
              const header = getTemplateHeader(template);
              const footer = getTemplateFooter(template);

              return (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                          <button
                            onClick={() => copyTemplateName(template.name)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Copiar nome"
                          >
                            <LuCopy className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {CATEGORY_LABELS[template.category] || template.category}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>{template.language}</span>
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        {statusStyle.icon}
                        {STATUS_LABELS[template.status] || template.status}
                      </div>
                    </div>
                  </div>

                  {/* Card Body - Preview */}
                  <div className="p-4">
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      {header && (
                        <p className="text-sm font-medium text-gray-700">{header}</p>
                      )}
                      <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">
                        {body}
                      </p>
                      {footer && (
                        <p className="text-xs text-gray-400">{footer}</p>
                      )}
                    </div>

                    {/* Rejected Reason */}
                    {template.status === 'REJECTED' && template.rejected_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Motivo da rejeição:</strong> {template.rejected_reason}
                        </p>
                      </div>
                    )}

                    {/* Quality Score */}
                    {template.quality_score && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Qualidade:</span>
                        <span
                          className={`font-medium ${
                            template.quality_score.score === 'GREEN'
                              ? 'text-emerald-600'
                              : template.quality_score.score === 'YELLOW'
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          {template.quality_score.score === 'GREEN'
                            ? 'Alta'
                            : template.quality_score.score === 'YELLOW'
                            ? 'Média'
                            : 'Baixa'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="px-4 pb-4 flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/campanhas/whatsapp/templates/${template.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <LuEye className="w-4 h-4" />
                      Ver Detalhes
                    </Link>

                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowDeleteModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LuTrash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Excluir Template</h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir o template{' '}
                <strong>&quot;{selectedTemplate.name}&quot;</strong>? Esta ação não pode ser
                desfeita.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedTemplate(null);
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
