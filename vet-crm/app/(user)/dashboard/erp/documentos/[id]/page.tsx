'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const GREEN = '#0f6e56';
const BG = '#F6F2EA';
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
      <div style={{ minHeight: '100%', background: BG, padding: 24 }}>
        <div style={{ maxWidth: 896, margin: '0 auto' }}>
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity: 0.7 }}>
            <div style={{ height: 32, background: DIV, borderRadius: 8, width: '33%' }} />
            <div style={{ background: '#fff', borderRadius: 14, padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ height: 24, background: DIV, borderRadius: 6, width: '50%' }} />
              <div style={{ height: 16, background: DIV, borderRadius: 6, width: '100%' }} />
              <div style={{ height: 16, background: DIV, borderRadius: 6, width: '75%' }} />
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

  return (
    <div style={{ minHeight: '100%', background: BG, width: '100%' }}>
      <div style={{ padding: 24 }}>
        <div style={{ maxWidth: 896, margin: '0 auto' }}>
          {/* Header */}
          <div className="print:hidden" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link
                href="/dashboard/erp/documentos"
                style={{ display: 'inline-flex', padding: 8, borderRadius: 9, textDecoration: 'none', fontSize: 18, color: TXT2 }}
              >
                ←
              </Link>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 500, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  {document.title}
                </h1>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handlePrint}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: '#fff', border: `1px solid ${LINE}`, color: TXT2, borderRadius: 9, fontSize: 13.5, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 14 }}>🖨️</span>
                Imprimir
              </button>
              <Link
                href={`/dashboard/erp/documentos/${id}/editar`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: TEAL, color: '#fff', borderRadius: 9, fontWeight: 500, fontSize: 13.5, textDecoration: 'none' }}
              >
                <span>✏️</span>
                Editar
              </Link>
            </div>
          </div>

          {/* Document info */}
          <div className="print:border-none" style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 20, marginBottom: 18 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, fontSize: 13, color: TXT2 }}>
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontWeight: 500, background: status.bg, color: status.fg }}
              >
                <span style={{ fontSize: 13 }}>{status.icon}</span>
                {status.label}
              </span>

              {document.category && (
                <span style={{ padding: '6px 12px', background: DIV, borderRadius: 20, color: TXT2 }}>
                  {document.category}
                </span>
              )}

              {document.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 5 }}>
                  {document.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{ padding: '4px 10px', background: TINT, color: TEAL_DARK, borderRadius: 20, fontSize: 11.5 }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <span style={{ marginLeft: 'auto', color: TXT3 }}>
                Atualizado em {formatDate(document.updatedAt)}
              </span>
            </div>
          </div>

          {/* Document content */}
          <div className="print:border-none" style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, overflow: 'hidden' }}>
            <div
              className="prose prose-lg max-w-none"
              style={{ padding: 32 }}
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
