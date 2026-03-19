'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { LuLoaderCircle } from 'react-icons/lu';

const LandingPageEditor = dynamic(
  () => import('@/components/protected/landing-pages/LandingPageEditor'),
  { ssr: false },
);

interface LandingPageData {
  id: string;
  name: string;
  slug: string;
  content: any;
  styles: any;
  settings: any;
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const [pageData, setPageData] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage() {
      try {
        const res = await fetch(`/api/landing-pages/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Landing page não encontrada');
          } else {
            setError('Erro ao carregar landing page');
          }
          return;
        }
        const data = await res.json();
        setPageData(data);
      } catch {
        setError('Erro de conexão');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadPage();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <LuLoaderCircle className="w-8 h-8 text-cyan-500 dark:text-cyan-400 animate-spin" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">Carregando editor...</span>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-gray-500 dark:text-gray-400">{error || 'Página não encontrada'}</p>
          <button
            onClick={() => router.push('/dashboard/landing-pages')}
            className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 text-sm"
          >
            Voltar para Landing Pages
          </button>
        </div>
      </div>
    );
  }

  return <LandingPageEditor pageData={pageData} />;
}
