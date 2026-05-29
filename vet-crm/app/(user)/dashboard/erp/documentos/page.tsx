'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LuFileText,
  LuPlus,
  LuSearch
  LuPencil,
  LuTrash,
  LuEye
  LuCheck
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

interface Document {
  id: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  category: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

async function readResponseBody(res: Response): Promise<unknown> {
  const raw = await res.text().catch(() => '');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'string') return data || fallback;
  if (!data || typeof data !== 'object') return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.error === 'string' && obj.error) return obj.error;
  if (typeof obj.message === 'string' && obj.message) return obj.message;
  if (Array.isArray(obj.message) && obj.message.every((x) => typeof x === 'string')) return obj.message.join(', ');
  return fallback;
}

const statusConfig = {
  DRAFT: {
    label: 'Rascunho',
    color: 'bg-yellow-100 text-yellow-700',
    icon: () => <span style={{fontSize:"14px"}}>⏱</span>},
  PUBLISHED: {
    label: 'Publicado',
    color: 'bg-green-100 text-green-700',
    icon: LuCheck},
  ARCHIVED: {
    label: 'Arquivado',
    color: 'bg-gray-100 text-gray-700',
    icon: () => <span style={{fontSize:"14px"}}>📦</span>}};

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').substring(0, 150);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'});
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await readResponseBody(res);

      if (!res.ok) {
        throw new Error(extractErrorMessage(data, 'Erro ao carregar documentos'));
      }

      const obj = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
      const docs = obj?.documents;
      setDocuments(Array.isArray(docs) ? (docs as Document[]) : []);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [searchTerm, statusFilter]);

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const res = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE'});

      if (!res.ok) {
        const data = await readResponseBody(res);
        throw new Error(extractErrorMessage(data, 'Erro ao excluir documento'));
      }

      toast.success('Documento excluído com sucesso!');
      fetchDocuments();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao excluir documento';
      toast.error(message);
      throw error;
    } finally {
      setDocumentToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full">
      <ConfirmDeleteModal
        isOpen={Boolean(documentToDelete)}
        entityLabel="Documento"
        itemName={documentToDelete?.title || '—'}
        consequenceText="Esta ação não pode ser desfeita. O documento será permanentemente removido."
        onClose={() => setDocumentToDelete(null)}
        onConfirm={handleDelete}
      />

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <LuFileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                Documentos
              </h1>
              <p className="text-gray-500 mt-1">
                Gerencie seus templates e documentos
              </p>
            </div>
            <Link
              href="/dashboard/erp/documentos/novo"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 font-medium"
            >
              <LuPlus className="w-5 h-5" />
              Novo Documento
            </Link>
          </div>

          {/* Filters */}
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Status filter */}
              <div className="relative">
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors appearance-none bg-white min-w-[160px]"
                >
                  <option value="">Todos os status</option>
                  <option value="DRAFT">Rascunho</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="ARCHIVED">Arquivado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Documents list */}
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-4">
                    <div className="h-16 w-16 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <LuFileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Nenhum documento encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter
                    ? 'Tente ajustar seus filtros de busca'
                    : 'Comece criando seu primeiro documento'}
                </p>
                {!searchTerm && !statusFilter && (
                  <Link
                    href="/dashboard/erp/documentos/novo"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <LuPlus className="w-4 h-4" />
                    Criar Documento
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {documents.map((doc) => {
                  const status = statusConfig[doc.status] || statusConfig.DRAFT;
                  const StatusIcon = status?.icon ||;

                  return (
                    <div
                      key={doc.id}
                      className="p-4 sm:p-6 hover:bg-gray-50/50 transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="hidden sm:flex w-12 h-12 bg-blue-50 rounded-xl items-center justify-center flex-shrink-0">
                          <LuFileText className="w-6 h-6 text-blue-600" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {doc.title}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {stripHtml(doc.content) || 'Sem conteúdo'}
                              </p>
                            </div>

                            {/* Status badge */}
                            <span
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                          </div>

                          {/* Meta info */}
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                            <span>Criado em {formatDate(doc.createdAt)}</span>
                            {doc.category && (
                              <span className="px-2 py-0.5 bg-gray-100 rounded-md text-gray-600">
                                {doc.category}
                              </span>
                            )}
                            {doc.tags.length > 0 && (
                              <div className="flex gap-1">
                                {doc.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => router.push(`/dashboard/erp/documentos/${doc.id}`)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                            title="Visualizar"
                          >
                            <LuEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/erp/documentos/${doc.id}/editar`)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                            title="Editar"
                          >
                            <LuPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDocumentToDelete(doc)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                            title="Excluir"
                          >
                            <LuTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
