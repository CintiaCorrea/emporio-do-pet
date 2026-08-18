import { NextRequest } from 'next/server';
import { chamarPortalArquivo } from '@/lib/portal-proxy';

/** Abre um documento (receita/exame) do tutor — proxy BINÁRIO (PDF/imagem). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return chamarPortalArquivo(request, `/portal/documento/${encodeURIComponent(id)}`);
}
