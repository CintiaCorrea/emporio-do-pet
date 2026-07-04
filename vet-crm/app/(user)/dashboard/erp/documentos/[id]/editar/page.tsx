'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/protected/dashboard/documents/RichTextEditor';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const ORANGE = '#D85A30';
const BG = '#F6F2EA';
const LINE = '#E8E2D6';
const DIV = '#F0EBE0';
const TXT = '#1F2A2E';
const TXT2 = '#5C6B70';

interface Document {
  id: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  category: string | null;
  tags: string[];
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

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: TXT2, marginBottom: 6 };

export default function EditDocumentPage({
  params}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const res = await fetch(`/api/documents/${id}`);
        const data = await readResponseBody(res);

        if (!res.ok) {
          throw new Error(extractErrorMessage(data, 'Erro ao carregar documento'));
        }

        const obj = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
        setTitle(typeof obj?.title === 'string' ? obj.title : '');
        setContent(typeof obj?.content === 'string' ? obj.content : '');
        setStatus((obj?.status as any) ?? 'DRAFT');
        setCategory(typeof obj?.category === 'string' ? obj.category : '');
        setTagsInput(Array.isArray(obj?.tags) ? (obj?.tags as string[]).join(', ') : '');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar documento');
        router.push('/dashboard/erp/documentos');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, router]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }

    try {
      setSaving(true);

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content,
          status,
          category: category.trim() || null,
          tags})});

      if (!res.ok) {
        const data = await readResponseBody(res);
        throw new Error(extractErrorMessage(data, 'Erro ao salvar documento'));
      }

      toast.success('Documento atualizado com sucesso!');
      router.push('/dashboard/erp/documentos');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar documento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE'});

      if (!res.ok) {
        const data = await readResponseBody(res);
        throw new Error(extractErrorMessage(data, 'Erro ao excluir documento'));
      }

      toast.success('Documento excluído com sucesso!');
      router.push('/dashboard/erp/documentos');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao excluir documento';
      toast.error(message);
      throw error;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100%', background: BG, padding: 24 }}>
        <div style={{ maxWidth: 1024, margin: '0 auto' }}>
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity: 0.7 }}>
            <div style={{ height: 32, background: DIV, borderRadius: 8, width: '33%' }} />
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ height: 40, background: DIV, borderRadius: 8 }} />
              <div style={{ height: 40, background: DIV, borderRadius: 8 }} />
            </div>
            <div style={{ background: '#fff', borderRadius: 14, height: 400 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: BG, width: '100%' }}>
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        entityLabel="Documento"
        itemName={title}
        consequenceText="Esta ação não pode ser desfeita. O documento será permanentemente removido."
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />

      <div style={{ padding: 24 }}>
        <div style={{ maxWidth: 1024, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link
                href="/dashboard/erp/documentos"
                style={{ display: 'inline-flex', padding: 8, borderRadius: 9, textDecoration: 'none', fontSize: 18, color: TXT2 }}
              >
                ←
              </Link>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 500, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                  <span style={{ fontSize: 24 }}>📝</span>
                  Editar Documento
                </h1>
                <p style={{ color: TXT2, margin: '4px 0 0', fontSize: 13.5 }}>
                  Atualize o conteúdo do documento
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: '#fff', border: `1px solid ${ORANGE}`, color: ORANGE, borderRadius: 9, fontSize: 13.5, cursor: 'pointer' }}
              >
                <span>🗑️</span>
                Excluir
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: TEAL, color: '#fff', border: 'none', borderRadius: 9, fontWeight: 500, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}
              >
                <span>✅</span>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Title and Status */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 20 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 260px' }}>
                  <label style={lbl}>
                    Título do Documento *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Contrato de Serviço Veterinário"
                    style={inp}
                  />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={lbl}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')
                    }
                    style={inp}
                  >
                    <option value="DRAFT">Rascunho</option>
                    <option value="PUBLISHED">Publicado</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <label style={lbl}>
                    <span style={{ fontSize: 14 }}>📁</span>
                    {' '}Categoria
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Contratos, Prontuários, Termos"
                    style={inp}
                  />
                </div>
                <div style={{ flex: '1 1 220px' }}>
                  <label style={lbl}>
                    <span style={{ fontSize: 14 }}>🏷️</span>
                    {' '}Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Ex: urgente, cliente-vip, cirurgia"
                    style={inp}
                  />
                </div>
              </div>
            </div>

            {/* Editor */}
            <div>
              <label style={{ ...lbl, marginBottom: 8 }}>
                Conteúdo do Documento
              </label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Comece a escrever o conteúdo do seu documento..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
