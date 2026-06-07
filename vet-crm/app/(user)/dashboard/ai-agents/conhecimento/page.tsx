'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import {
  LuPlus,
  LuTrash,
  LuFileText,
  LuLoader,
  LuSearch} from 'react-icons/lu';
import { toast } from 'sonner';

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  status: string;
  totalDocuments: number;
  totalChunks: number;
  totalSizeBytes: number;
  createdAt: string;
  _count?: { documents: number; agents: number };
}

export default function KnowledgeBasesPage() {
  const router = useRouter();
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [baseToDelete, setBaseToDelete] = useState<KnowledgeBase | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [search, setSearch] = useState('');

  const fetchBases = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge-bases');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBases(data);
    } catch {
      toast.error('Erro ao carregar bases de conhecimento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBases(); }, [fetchBases]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/knowledge-bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDescription })});
      if (!res.ok) throw new Error();
      const created = await res.json();
      toast.success('Base de conhecimento criada!');
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      router.push(`/dashboard/ai-agents/conhecimento/${created.id}`);
    } catch {
      toast.error('Erro ao criar base de conhecimento');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!baseToDelete) return;

    try {
      const res = await fetch(`/api/knowledge-bases/${baseToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Base de conhecimento excluída');
      await fetchBases();
    } catch {
      throw new Error('Erro ao excluir base de conhecimento');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filtered = bases.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-3 pb-4 pt-4 sm:space-y-6 sm:px-5 sm:pb-6 sm:pt-6 md:px-6 md:pt-7 lg:px-8 lg:pt-8">
      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#009AAC] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#00798A]"
        >
          <LuPlus className="w-4 h-4" />
          Nova base
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar base de conhecimento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-[#d8d0bc] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#009AAC]"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LuLoader className="w-6 h-6 animate-spin text-[#009AAC]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center dark:border-gray-700 dark:bg-gray-800 sm:px-6 sm:py-16">
          <span style={{fontSize:"14px"}}>🗄</span>
          <h3 className="mb-2 text-base font-medium text-gray-900 dark:text-white sm:text-lg">
            {search ? 'Nenhuma base encontrada' : 'Nenhuma base de conhecimento'}
          </h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-gray-500 dark:text-gray-400">
            {search
              ? 'Tente uma busca diferente'
              : 'Crie uma base de conhecimento para seus agentes usarem RAG'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-[#009AAC] hover:bg-[#00798A] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <LuPlus className="w-4 h-4" />
              Criar primeira base
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((kb) => (
            <div
              key={kb.id}
              className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-[#009AAC] dark:border-gray-700 dark:bg-gray-800 dark:hover:border-[#00798A] sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <Link
                  href={`/dashboard/ai-agents/conhecimento/${kb.id}`}
                  className="group min-w-0 flex-1"
                >
                  <div className="mb-2 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E0F4F6] dark:bg-[#E0F4F6]">
                      <span style={{fontSize:"14px"}}>🗄</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="flex items-start gap-1 break-words font-semibold text-gray-900 transition-colors group-hover:text-[#009AAC] dark:text-white">
                        {kb.name}
                        <span style={{fontSize:"14px"}}>▶</span>
                      </h3>
                      {kb.description && (
                        <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400 sm:line-clamp-1">
                          {kb.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-700/60">
                      <LuFileText className="w-4 h-4" />
                      {kb.totalDocuments} documento{kb.totalDocuments !== 1 ? 's' : ''}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-700/60">
                      {kb.totalChunks} chunks
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-700/60">
                      {formatBytes(kb.totalSizeBytes)}
                    </span>
                    {kb._count?.agents ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-700/60">
                        <span style={{fontSize:"14px"}}>🤖</span>
                        {kb._count.agents} agente{kb._count.agents !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>
                </Link>

                <button
                  onClick={() => setBaseToDelete(kb)}
                  className="flex items-center justify-center self-end rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 sm:self-start"
                  title="Excluir"
                >
                  <LuTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4">
          <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 dark:bg-gray-800 sm:max-h-[calc(100vh-2rem)] sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Nova Base de Conhecimento
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Preços e Serviços"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#009AAC]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descreva o tipo de conteúdo desta base..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#009AAC] resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => { setShowCreateModal(false); setNewName(''); setNewDescription(''); }}
                className="w-full px-4 py-2 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white sm:w-auto"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#009AAC] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00798A] disabled:bg-gray-400 sm:w-auto"
              >
                {creating && <LuLoader className="w-4 h-4 animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!baseToDelete}
        entityLabel="Base de Conhecimento"
        itemName={baseToDelete?.name ?? ''}
        consequenceText="Esta ação não pode ser desfeita. Todos os documentos e chunks serão removidos."
        onClose={() => setBaseToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
