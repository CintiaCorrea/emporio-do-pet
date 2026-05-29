'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuSave,
  LuLoader
  LuCheck
  LuTrash
  LuPencil,
  LuEye
  LuPhone} from 'react-icons/lu';
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
  example?: {
    header_text?: string[];
    header_handle?: string[];
    body_text?: string[][];
  };
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

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  APPROVED: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    icon: <LuCheck className="w-5 h-5" />,
    label: 'Aprovado'},
  PENDING: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    icon: <span style={{fontSize:"14px"}}>⏱</span>,
    label: 'Pendente'},
  REJECTED: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: <span style={{fontSize:"14px"}}>✕</span>,
    label: 'Rejeitado'},
  PAUSED: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    icon: <span style={{fontSize:"14px"}}>⏸</span>,
    label: 'Pausado'},
  DISABLED: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: <span style={{fontSize:"14px"}}>⚠</span>,
    label: 'Desativado'},
  IN_APPEAL: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: <span style={{fontSize:"14px"}}>⏱</span>,
    label: 'Em Recurso'}};

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação'};

const LANGUAGE_LABELS: Record<string, string> = {
  pt_BR: 'Português (Brasil)',
  en_US: 'English (US)',
  es: 'Español'};

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editBodyText, setEditBodyText] = useState('');
  const [editHeaderText, setEditHeaderText] = useState('');

  const loadTemplate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/whatsapp-templates/${id}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao carregar template');
      }

      setTemplate(data);

      // Set edit values
      const bodyComponent = data.components?.find((c: TemplateComponent) => c.type === 'BODY');
      const headerComponent = data.components?.find((c: TemplateComponent) => c.type === 'HEADER');
      setEditBodyText(bodyComponent?.text || '');
      setEditHeaderText(headerComponent?.text || '');
    } catch (err) {
      console.error('Erro ao carregar template:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [id]);

  const handleDelete = async () => {
    if (!template) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/whatsapp-templates/${template.name}`, {
        method: 'DELETE'});

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao excluir template');
      }

      toast.success('Template excluído com sucesso');
      router.push('/dashboard/campanhas/whatsapp/templates');
    } catch (err) {
      console.error('Erro ao excluir template:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir template');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!template) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/whatsapp-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodyText: editBodyText,
          headerText: editHeaderText || undefined})});

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao atualizar template');
      }

      toast.success('Template atualizado! Aguardando nova aprovação.');
      setEditing(false);
      loadTemplate();
    } catch (err) {
      console.error('Erro ao atualizar template:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar template');
    } finally {
      setSaving(false);
    }
  };

  const copyTemplateName = () => {
    if (template) {
      navigator.clipboard.writeText(template.name);
      toast.success('Nome do template copiado!');
    }
  };

  const getComponent = (type: string): TemplateComponent | undefined => {
    return template?.components?.find((c) => c.type === type);
  };

  const canEdit = template && ['REJECTED', 'PAUSED'].includes(template.status);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span style={{fontSize:"14px"}}>⚠</span>
              </div>
              <div>
                <h3 className="font-semibold text-red-900">Erro ao carregar template</h3>
                <p className="text-red-700 mt-1">{error || 'Template não encontrado'}</p>
                <Link
                  href="/dashboard/campanhas/whatsapp/templates"
                  className="inline-flex items-center gap-2 mt-4 text-red-600 hover:text-red-700"
                >
                  <LuArrowLeft className="w-4 h-4" />
                  Voltar para lista
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[template.status] || STATUS_CONFIG.DISABLED;
  const headerComponent = getComponent('HEADER');
  const bodyComponent = getComponent('BODY');
  const footerComponent = getComponent('FOOTER');
  const buttonsComponent = getComponent('BUTTONS');

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/campanhas/whatsapp" className="hover:text-cyan-600">
            WhatsApp
          </Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <Link
            href="/dashboard/campanhas/whatsapp/templates"
            className="hover:text-cyan-600"
          >
            Templates
          </Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">
            {template.name}
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard/campanhas/whatsapp/templates"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <LuArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                <button
                  onClick={copyTemplateName}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copiar nome"
                >
                  <span style={{fontSize:"14px"}}>⎘</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </div>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">
                  {CATEGORY_LABELS[template.category] || template.category}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">
                  {LANGUAGE_LABELS[template.language] || template.language}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              <span style={{fontSize:"14px"}}>↻</span>
              Atualizar
            </button>

            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium transition-colors"
              >
                <LuPencil className="w-4 h-4" />
                Editar
              </button>
            )}

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
            >
              <LuTrash className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>

        {/* Rejected Reason Alert */}
        {template.status === 'REJECTED' && template.rejected_reason && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span style={{fontSize:"14px"}}>⚠</span>
              <div>
                <h3 className="font-semibold text-red-900">Motivo da Rejeição</h3>
                <p className="text-red-700 mt-1">{template.rejected_reason}</p>
                {canEdit && (
                  <p className="text-sm text-red-600 mt-2">
                    Você pode editar o template e reenviar para aprovação.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quality Score */}
        {template.quality_score && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pontuação de Qualidade</span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    template.quality_score.score === 'GREEN'
                      ? 'bg-cyan-500'
                      : template.quality_score.score === 'YELLOW'
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                />
                <span
                  className={`font-medium ${
                    template.quality_score.score === 'GREEN'
                      ? 'text-cyan-600'
                      : template.quality_score.score === 'YELLOW'
                      ? 'text-orange-600'
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
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Content */}
          <div className="space-y-6">
            {/* Header */}
            {headerComponent && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Cabeçalho</h2>
                {editing && headerComponent.format === 'TEXT' ? (
                  <input
                    type="text"
                    value={editHeaderText}
                    onChange={(e) => setEditHeaderText(e.target.value)}
                    maxLength={60}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                ) : (
                  <div>
                    {headerComponent.format === 'TEXT' ? (
                      <p className="text-gray-700">{headerComponent.text}</p>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500">
                        {headerComponent.format === 'IMAGE' && (
                          <>
                            <span style={{fontSize:"14px"}}>🖼</span>
                            <span>Imagem</span>
                          </>
                        )}
                        {headerComponent.format === 'VIDEO' && (
                          <>
                            <span style={{fontSize:"14px"}}>🎥</span>
                            <span>Vídeo</span>
                          </>
                        )}
                        {headerComponent.format === 'DOCUMENT' && (
                          <>
                            <span style={{fontSize:"14px"}}>📄</span>
                            <span>Documento</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Corpo da Mensagem</h2>
              {editing ? (
                <textarea
                  value={editBodyText}
                  onChange={(e) => setEditBodyText(e.target.value)}
                  rows={6}
                  maxLength={1024}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{bodyComponent?.text}</p>
              )}
            </div>

            {/* Footer */}
            {footerComponent && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Rodapé</h2>
                <p className="text-gray-500">{footerComponent.text}</p>
              </div>
            )}

            {/* Buttons */}
            {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Botões</h2>
                <div className="space-y-3">
                  {buttonsComponent.buttons.map((button, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      {button.type === 'QUICK_REPLY' && (
                        <span style={{fontSize:"14px"}}>↪</span>
                      )}
                      {button.type === 'URL' && (
                        <span style={{fontSize:"14px"}}>🔗</span>
                      )}
                      {button.type === 'PHONE_NUMBER' && (
                        <LuPhone className="w-5 h-5 text-gray-400" />
                      )}
                      {button.type === 'COPY_CODE' && (
                        <span style={{fontSize:"14px"}}>⎘</span>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{button.text}</p>
                        {button.url && (
                          <p className="text-sm text-gray-500 truncate">{button.url}</p>
                        )}
                        {button.phone_number && (
                          <p className="text-sm text-gray-500">{button.phone_number}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Actions */}
            {editing && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditBodyText(bodyComponent?.text || '');
                    setEditHeaderText(headerComponent?.text || '');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
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
            )}
          </div>

          {/* Preview */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <LuEye className="w-5 h-5 text-cyan-600" />
                Pré-visualização
              </h2>

              <div className="bg-[#e5ddd5] rounded-2xl p-4">
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  {headerComponent && (
                    <>
                      {headerComponent.format === 'TEXT' && headerComponent.text && (
                        <p className="font-medium text-gray-900 mb-2">
                          {editing ? editHeaderText : headerComponent.text}
                        </p>
                      )}
                      {headerComponent.format && headerComponent.format !== 'TEXT' && (
                        <div className="bg-gray-100 rounded-lg p-8 mb-2 flex items-center justify-center">
                          {headerComponent.format === 'IMAGE' && (
                            <span style={{fontSize:"14px"}}>🖼</span>
                          )}
                          {headerComponent.format === 'VIDEO' && (
                            <span style={{fontSize:"14px"}}>🎥</span>
                          )}
                          {headerComponent.format === 'DOCUMENT' && (
                            <span style={{fontSize:"14px"}}>📄</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {editing ? editBodyText : bodyComponent?.text}
                  </p>
                  {footerComponent?.text && (
                    <p className="text-gray-500 text-xs mt-2">{footerComponent.text}</p>
                  )}
                </div>
                {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {buttonsComponent.buttons.map((button, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg p-2 text-center text-cyan-600 text-sm font-medium shadow-sm"
                      >
                        {button.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Template ID */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">ID do Template</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{template.id}</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Excluir Template</h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir o template{' '}
                <strong>&quot;{template.name}&quot;</strong>? Esta ação não pode ser desfeita.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <LuLoader className="w-5 h-5 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
