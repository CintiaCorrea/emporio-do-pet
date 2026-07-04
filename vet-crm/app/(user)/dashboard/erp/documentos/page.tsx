'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const ORANGE = '#D85A30';
const GREEN = '#0f6e56';
const BG = '#F6F2EA';
const SOFT = '#FBF9F4';
const TINT = '#E0F4F6';
const LINE = '#E8E2D6';
const DIV = '#F0EBE0';
const TXT = '#1F2A2E';
const TXT2 = '#5C6B70';
const TXT3 = '#8A989D';

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
    bg: '#fdf6e3',
    fg: '#854F0B',
    icon: '⏱'},
  PUBLISHED: {
    label: 'Publicado',
    bg: '#e1f5ee',
    fg: GREEN,
    icon: '✅'},
  ARCHIVED: {
    label: 'Arquivado',
    bg: DIV,
    fg: TXT2,
    icon: '📦'}};

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

  const iconBtn: React.CSSProperties = { border: 'none', background: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, lineHeight: 1, fontSize: 15 };

  return (
    <div style={{ width: '100%', background: BG, minHeight: '100%' }}>
      <ConfirmDeleteModal
        isOpen={Boolean(documentToDelete)}
        entityLabel="Documento"
        itemName={documentToDelete?.title || '—'}
        consequenceText="Esta ação não pode ser desfeita. O documento será permanentemente removido."
        onClose={() => setDocumentToDelete(null)}
        onConfirm={handleDelete}
      />

      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box', maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <span style={{ fontSize: 26 }}>📄</span>
              Documentos
            </h1>
            <p style={{ color: TXT2, margin: '6px 0 0', fontSize: 13.5 }}>
              Gerencie seus templates e documentos
            </p>
          </div>
          <Link
            href="/dashboard/erp/documentos/novo"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: TEAL, color: '#fff', borderRadius: 9, fontWeight: 500, fontSize: 13.5, textDecoration: 'none' }}
          >
            <span>➕</span>
            Novo Documento
          </Link>
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: '1 1 220px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 36px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff', boxSizing: 'border-box' }}
              />
            </div>

            {/* Status filter */}
            <div style={{ position: 'relative' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '9px 12px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff', minWidth: 160 }}
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
        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 16, opacity: 0.6 }} className="animate-pulse">
                  <div style={{ height: 64, width: 64, background: DIV, borderRadius: 12 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                    <div style={{ height: 16, background: DIV, borderRadius: 6, width: '33%' }} />
                    <div style={{ height: 12, background: DIV, borderRadius: 6, width: '66%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 30 }}>
                📄
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: '0 0 6px' }}>
                Nenhum documento encontrado
              </h3>
              <p style={{ color: TXT2, margin: '0 0 16px', fontSize: 13.5 }}>
                {searchTerm || statusFilter
                  ? 'Tente ajustar seus filtros de busca'
                  : 'Comece criando seu primeiro documento'}
              </p>
              {!searchTerm && !statusFilter && (
                <Link
                  href="/dashboard/erp/documentos/novo"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: TEAL, color: '#fff', borderRadius: 9, fontSize: 13.5, fontWeight: 500, textDecoration: 'none' }}
                >
                  <span>➕</span>
                  Criar Documento
                </Link>
              )}
            </div>
          ) : (
            <div>
              {documents.map((doc, idx) => {
                const status = statusConfig[doc.status] || statusConfig.DRAFT;

                return (
                  <div
                    key={doc.id}
                    className="doc-row"
                    style={{ padding: '18px 20px', borderTop: idx === 0 ? 'none' : `1px solid ${DIV}` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      {/* Icon */}
                      <div style={{ width: 48, height: 48, background: TINT, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
                        📄
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ minWidth: 0 }}>
                            <h3 style={{ fontSize: 16.5, fontWeight: 500, color: TEAL_DARK, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.title}
                            </h3>
                            <p style={{ fontSize: 13, color: TXT2, margin: '4px 0 0' }}>
                              {stripHtml(doc.content) || 'Sem conteúdo'}
                            </p>
                          </div>

                          {/* Status badge */}
                          <span
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, flexShrink: 0, background: status.bg, color: status.fg }}
                          >
                            <span style={{ fontSize: 12 }}>{status.icon}</span>
                            {status.label}
                          </span>
                        </div>

                        {/* Meta info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, fontSize: 12.5, color: TXT3, flexWrap: 'wrap' }}>
                          <span>Criado em {formatDate(doc.createdAt)}</span>
                          {doc.category && (
                            <span style={{ padding: '2px 8px', background: DIV, borderRadius: 6, color: TXT2 }}>
                              {doc.category}
                            </span>
                          )}
                          {doc.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 5 }}>
                              {doc.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  style={{ padding: '2px 8px', background: TINT, color: TEAL_DARK, borderRadius: 6, fontSize: 11.5 }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => router.push(`/dashboard/erp/documentos/${doc.id}`)}
                          style={{ ...iconBtn, color: TEAL }}
                          title="Visualizar"
                        >
                          🔍
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/erp/documentos/${doc.id}/editar`)}
                          style={{ ...iconBtn, color: TXT2 }}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDocumentToDelete(doc)}
                          style={{ ...iconBtn, color: ORANGE }}
                          title="Excluir"
                        >
                          🗑️
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
  );
}
