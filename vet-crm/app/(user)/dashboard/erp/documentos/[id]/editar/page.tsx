'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuSave,
  LuFileText
  LuTrash} from 'react-icons/lu';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/protected/dashboard/documents/RichTextEditor';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="bg-white rounded-2xl p-6 space-y-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
            <div className="bg-white rounded-2xl h-[400px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full">
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        entityLabel="Documento"
        itemName={title}
        consequenceText="Esta ação não pode ser desfeita. O documento será permanentemente removido."
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />

      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/erp/documentos"
                className="p-2 hover:bg-white rounded-xl transition-colors"
              >
                <LuArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <LuFileText className="w-6 h-6 text-blue-600" />
                  </div>
                  Editar Documento
                </h1>
                <p className="text-gray-500 mt-0.5">
                  Atualize o conteúdo do documento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
              >
                <LuTrash className="w-5 h-5" />
                Excluir
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LuSave className="w-5 h-5" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Title and Status */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Título do Documento *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Contrato de Serviço Veterinário"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white"
                  >
                    <option value="DRAFT">Rascunho</option>
                    <option value="PUBLISHED">Publicado</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span style={{fontSize:"14px"}}>📁</span>
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Contratos, Prontuários, Termos"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span style={{fontSize:"14px"}}>🏷</span>
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Ex: urgente, cliente-vip, cirurgia"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
