'use client';

import { useRouter } from 'next/navigation';
import {
  LuPencil
  LuDownload,
  LuTrash,
  LuFileText,
  LuEllipsisVertical} from 'react-icons/lu';
import { useState, useRef, useEffect } from 'react';

interface LandingPageItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  updatedAt: string;
}

interface LandingPageCardProps {
  page: LandingPageItem;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, slug: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-500/30' },
  PUBLISHED: { label: 'Publicado', className: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30' },
  ARCHIVED: { label: 'Arquivado', className: 'bg-gray-100 dark:bg-gray-500/20 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-500/30' }};

export default function LandingPageCard({
  page,
  onDuplicate,
  onDelete,
  onExport}: LandingPageCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = STATUS_LABELS[page.status] || STATUS_LABELS.DRAFT;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div className="bg-white/95 dark:bg-white/5 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-2xl hover:border-cyan-500/30 transition-all group relative shadow-sm dark:shadow-none">
      <div
        className="h-40 bg-gray-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer relative rounded-t-2xl overflow-hidden"
        onClick={() => router.push(`/dashboard/landing-pages/${page.id}/editor`)}
      >
        {page.thumbnail ? (
          <img
            src={page.thumbnail}
            alt={page.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <LuFileText className="w-10 h-10 text-gray-300 dark:text-slate-500" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1.5 rounded-lg">
            Abrir Editor
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-gray-900 font-semibold text-sm truncate">
              {page.name}
            </h3>
            <p className="text-gray-500 text-xs mt-0.5 truncate">
              /{page.slug}
            </p>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <LuEllipsisVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 bottom-8 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[160px]">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`/dashboard/landing-pages/${page.id}/editor`);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                >
                  <LuPencil className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate(page.id);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                >
                  <span style={{fontSize:"14px"}}>⎘</span>
                  Duplicar
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onExport(page.id, page.slug);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                >
                  <LuDownload className="w-3.5 h-3.5" />
                  Exportar
                </button>
                <div className="h-px bg-gray-200 dark:bg-slate-700 my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(page.id);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300"
                >
                  <LuTrash className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${status.className}`}
          >
            {status.label}
          </span>
          <span className="text-gray-500 text-xs">
            {new Date(page.updatedAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
    </div>
  );
}
