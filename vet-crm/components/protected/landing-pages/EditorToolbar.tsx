'use client';

import { useRouter } from 'next/navigation';
import {
  LuArrowLeft,
  LuSave
  LuDownload,
  LuLoaderCircle} from 'react-icons/lu';
import type { Editor } from 'grapesjs';

interface EditorToolbarProps {
  editor: Editor | null;
  pageName: string;
  pageSlug: string;
  pageId: string;
  isSaving: boolean;
  onSave: () => void;
  onExport: () => void;
}

export default function EditorToolbar({
  editor,
  pageName,
  isSaving,
  onSave,
  onExport}: EditorToolbarProps) {
  const router = useRouter();

  const setDevice = (device: string) => {
    if (!editor) return;
    editor.setDevice(device);
  };

  return (
    <div className="h-12 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/landing-pages')}
          className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
        >
          <LuArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="w-px h-5 bg-gray-200 dark:bg-slate-700" />
        <span className="text-gray-900 dark:text-white font-medium text-sm truncate max-w-[200px]">
          {pageName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setDevice('Desktop')}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Desktop"
        >
          <span style={{fontSize:"14px"}}>🖥</span>
        </button>
        <button
          onClick={() => setDevice('Tablet')}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Tablet"
        >
          <span style={{fontSize:"14px"}}>📱</span>
        </button>
        <button
          onClick={() => setDevice('Mobile portrait')}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Mobile"
        >
          <span style={{fontSize:"14px"}}>📱</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg transition-colors"
        >
          <LuDownload className="w-3.5 h-3.5" />
          Elementor
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <LuLoaderCircle className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LuSave className="w-3.5 h-3.5" />
          )}
          Salvar
        </button>
      </div>
    </div>
  );
}
