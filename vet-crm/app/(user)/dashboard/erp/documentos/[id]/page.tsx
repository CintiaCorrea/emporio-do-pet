'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuPencil,
  LuFileText
  LuCheck
} from 'react-icons/lu';
import toast from 'react-hot-toast';

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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'});
}

export default function DocumentDetailPage({
  params}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const res = await fetch(`/api/documents/${id}`);
        const data = await readResponseBody(res);

        if (!res.ok) {
          throw new Error(extractErrorMessage(data, 'Erro ao carregar documento'));
        }

        setDocument(data as Document);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar documento');
        router.push('/dashboard/erp/documentos');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, router]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="bg-white rounded-2xl p-8 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const status = statusConfig[document.status] || statusConfig.DRAFT;
  const StatusIcon = status?.icon ||;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 print:hidden">
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
                  {document.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <span style={{fontSize:"14px"}}>🖨</span>
                Imprimir
              </button>
              <Link
                href={`/dashboard/erp/documentos/${id}/editar`}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 font-medium"
              >
                <LuPencil className="w-5 h-5" />
                Editar
              </Link>
            </div>
          </div>

          {/* Document info */}
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-lg p-6 mb-6 print:shadow-none print:border-none">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${status.color}`}
              >
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </span>

              {document.category && (
                <span className="px-3 py-1.5 bg-gray-100 rounded-full text-gray-600">
                  {document.category}
                </span>
              )}

              {document.tags.length > 0 && (
                <div className="flex gap-1">
                  {document.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <span className="ml-auto">
                Atualizado em {formatDate(document.updatedAt)}
              </span>
            </div>
          </div>

          {/* Document content */}
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-lg overflow-hidden print:shadow-none print:border-none">
            <div
              className="prose prose-lg max-w-none p-8"
              dangerouslySetInnerHTML={{ __html: document.content }}
            />
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .prose,
          .prose * {
            visibility: visible;
          }
          .prose {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
