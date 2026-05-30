'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuPlus,
  LuSearch,
  LuFileText,
  LuLoaderCircle} from 'react-icons/lu';
import LandingPageCard from '@/components/protected/landing-pages/LandingPageCard';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import { downloadElementorJson } from '@/lib/landing-pages/download-elementor';
import { toast } from 'sonner';

interface LandingPageItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  updatedAt: string;
}

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'ARCHIVED', label: 'Arquivado' },
];

export default function LandingPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pageToDelete, setPageToDelete] = useState<LandingPageItem | null>(null);

  const loadPages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/landing-pages?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPages(data.items || []);
      }
    } catch {
      toast.error('Erro ao carregar landing pages');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/landing-pages/${id}/duplicate`, {
        method: 'POST'});
      if (res.ok) {
        toast.success('Landing page duplicada');
        loadPages();
      } else {
        toast.error('Erro ao duplicar');
      }
    } catch {
      toast.error('Erro ao duplicar landing page');
    }
  };

  const handleRequestDelete = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (page) setPageToDelete(page);
  };

  const handleConfirmDelete = async () => {
    if (!pageToDelete) return;
    const res = await fetch(`/api/landing-pages/${pageToDelete.id}`, {
      method: 'DELETE'});
    if (!res.ok) throw new Error('Erro ao excluir landing page');
    toast.success('Landing page excluída');
    setPages((prev) => prev.filter((p) => p.id !== pageToDelete.id));
  };

  const handleExport = async (id: string, slug: string) => {
    try {
      await downloadElementorJson(id, slug);
      toast.success('JSON Elementor exportado');
    } catch {
      toast.error('Erro ao exportar');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="relative overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/5 via-cyan-600/5 to-cyan-600/5 dark:from-cyan-600/20 dark:via-cyan-600/20 dark:to-cyan-600/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="relative px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2.5 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/20">
                <span style={{fontSize:"14px"}}>📐</span>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Landing Pages
                </h1>
                <p className="mt-2 text-gray-500 max-w-2xl">
                  Construa landing pages avançadas e exporte o JSON para o
                  Elementor.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard/landing-pages/nova')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-cyan-500 hover:from-cyan-400 hover:to-cyan-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/20"
            >
              <LuPlus className="w-4 h-4" />
              Nova Landing Page
            </button>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar landing pages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    statusFilter === f.value
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="mt-16 flex justify-center">
              <LuLoaderCircle className="w-8 h-8 text-cyan-500 dark:text-cyan-400 animate-spin" />
            </div>
          ) : pages.length === 0 ? (
            <div className="mt-16 flex flex-col items-center gap-4 text-center">
              <div className="p-4 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <LuFileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold">
                  Nenhuma landing page encontrada
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {search || statusFilter
                    ? 'Tente ajustar seus filtros de busca.'
                    : 'Crie sua primeira landing page para começar.'}
                </p>
              </div>
              {!search && !statusFilter && (
                <button
                  onClick={() =>
                    router.push('/dashboard/landing-pages/nova')
                  }
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-500 text-white rounded-xl font-medium text-sm"
                >
                  <LuPlus className="w-4 h-4" />
                  Criar Landing Page
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pages.map((page) => (
                <LandingPageCard
                  key={page.id}
                  page={page}
                  onDuplicate={handleDuplicate}
                  onDelete={handleRequestDelete}
                  onExport={handleExport}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={!!pageToDelete}
        entityLabel="Landing Page"
        itemName={pageToDelete?.name ?? ''}
        consequenceText="Esta ação não pode ser desfeita. A landing page e todo seu conteúdo serão removidos permanentemente."
        onClose={() => setPageToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
