'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuUpload,
  LuTrash,
  LuFileText,
  LuLoader
  LuPencil
} from 'react-icons/lu';
import { toast } from 'sonner';

interface KnowledgeDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  chunkCount: number;
  errorMessage?: string;
  createdAt: string;
}

interface KnowledgeBaseDetail {
  id: string;
  name: string;
  description?: string;
  status: string;
  totalDocuments: number;
  totalChunks: number;
  totalSizeBytes: number;
  documents: KnowledgeDocument[];
  _count?: { agents: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  READY: { label: 'Pronto', color: 'text-green-600 bg-green-50 dark:bg-green-900/20', icon: <span style={{fontSize:"14px"}}>✓</span> },
  PROCESSING: { label: 'Processando', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', icon: <LuLoader className="w-3.5 h-3.5 animate-spin" /> },
  PENDING: { label: 'Pendente', color: 'text-gray-500 bg-gray-50 dark:bg-gray-700', icon: <span style={{fontSize:"14px"}}>⏱</span> },
  ERROR: { label: 'Erro', color: 'text-red-600 bg-red-50 dark:bg-red-900/20', icon: <span style={{fontSize:"14px"}}>✗</span> }};

export default function KnowledgeBaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [kb, setKb] = useState<KnowledgeBaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchKb = useCallback(async () => {
    try {
      const res = await fetch(`/api/knowledge-bases/${id}`);
      if (!res.ok) throw new Error();
      const data: KnowledgeBaseDetail = await res.json();
      setKb(data);
      setEditName(data.name);
      setEditDesc(data.description || '');

      const hasProcessing = data.documents.some(
        (d) => d.status === 'PENDING' || d.status === 'PROCESSING',
      );
      if (hasProcessing && !pollRef.current) {
        pollRef.current = setInterval(() => fetchKb(), 3000);
      } else if (!hasProcessing && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch {
      toast.error('Erro ao carregar base de conhecimento');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchKb();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchKb]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo excede o limite de 20MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use PDF, DOCX, TXT ou CSV.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/knowledge-bases/${id}/documents`, {
        method: 'POST',
        body: formData});

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao enviar');
      }

      toast.success('Documento enviado! Processamento iniciado.');
      fetchKb();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar documento');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Excluir este documento e todos os seus chunks?')) return;
    try {
      const res = await fetch(`/api/knowledge-bases/${id}/documents/${docId}`, {
        method: 'DELETE'});
      if (!res.ok) throw new Error();
      toast.success('Documento excluído');
      fetchKb();
    } catch {
      toast.error('Erro ao excluir documento');
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/knowledge-bases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc })});
      if (!res.ok) throw new Error();
      toast.success('Atualizado com sucesso');
      setEditing(false);
      fetchKb();
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'});

  const fileTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      pdf: 'text-red-500',
      docx: 'text-blue-500',
      txt: 'text-gray-500',
      csv: 'text-green-500'};
    return icons[type] || 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl justify-center px-4 py-20 sm:px-6 lg:px-8">
        <LuLoader className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-gray-500">Base de conhecimento não encontrada</p>
        <Link href="/dashboard/ai-agents/conhecimento" className="text-indigo-600 text-sm mt-2 inline-block">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-6 pt-4 sm:space-y-6 sm:px-6 sm:pt-6 md:px-7 md:pt-7 lg:px-8 lg:pt-8">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/60 p-4 dark:border-gray-800 dark:bg-gray-900/40 sm:items-center sm:p-5">
        <Link
          href="/dashboard/ai-agents/conhecimento"
          className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <LuArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border-b-2 border-indigo-500 bg-transparent text-lg font-bold text-gray-900 outline-none dark:text-white sm:text-xl"
              />
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descrição..."
                className="w-full border-b border-gray-300 bg-transparent text-sm text-gray-500 outline-none dark:border-gray-600 dark:text-gray-400"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white"
                >
                  Salvar
                </button>
                <button
                  onClick={() => { setEditing(false); setEditName(kb.name); setEditDesc(kb.description || ''); }}
                  className="px-3 py-1 text-xs text-gray-500"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <h1 className="flex items-start gap-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                <span style={{fontSize:"14px"}}>🗄</span>
                <span className="min-w-0 break-words">{kb.name}</span>
                <button
                  onClick={() => setEditing(true)}
                  className="shrink-0 p-1 text-gray-400 transition-colors hover:text-indigo-600"
                >
                  <LuPencil className="w-4 h-4" />
                </button>
              </h1>
              {kb.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{kb.description}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Documentos', value: kb.totalDocuments, icon: <LuFileText className="w-5 h-5 text-indigo-600" /> },
          { label: 'Chunks', value: kb.totalChunks, icon: <span style={{fontSize:"14px"}}>🗄</span> },
          { label: 'Tamanho', value: formatBytes(kb.totalSizeBytes), icon: <span style={{fontSize:"14px"}}>📄</span> },
          { label: 'Agentes', value: kb._count?.agents || 0, icon: <span style={{fontSize:"14px"}}>⚙</span> },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center gap-2 mb-1">
              {stat.icon}
              <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Upload Area */}
      <div
        className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:px-6 sm:py-10 ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.csv"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <LuLoader className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Enviando documento...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <LuUpload className="w-8 h-8 text-gray-400" />
            <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
              Arraste e solte ou{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-indigo-600 font-medium hover:underline"
              >
                selecione um arquivo
              </button>
            </p>
            <p className="text-xs text-gray-400">PDF, DOCX, TXT ou CSV (max 20MB)</p>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Documentos ({kb.documents.length})
        </h2>
        {kb.documents.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-800">
            <LuFileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">Nenhum documento adicionado ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kb.documents.map((doc) => {
              const statusConfig = STATUS_CONFIG[doc.status] || STATUS_CONFIG.PENDING;
              return (
                <div
                  key={doc.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                      <LuFileText className={`w-4 h-4 ${fileTypeIcon(doc.fileType)}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {doc.fileName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{doc.fileType.toUpperCase()}</span>
                        <span>{formatBytes(doc.fileSize)}</span>
                        {doc.chunkCount > 0 && <span>{doc.chunkCount} chunks</span>}
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                      {doc.errorMessage && (
                        <p className="text-xs text-red-500 mt-1 truncate">{doc.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:ml-4 sm:justify-end">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <LuTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
