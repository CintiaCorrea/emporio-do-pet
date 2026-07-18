import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase, buildAuthHeader } from '@/lib/backend-proxy';

// Entrega o PDF/arquivo (binário) do histórico, autenticado. O arquivo fica PRIVADO
// no storage; o app baixa autenticado e repassa só pra quem está logado.
export async function GET(request: NextRequest, { params }: { params: Promise<{ histId: string }> }) {
  const { histId } = await params;
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  const auth = await buildAuthHeader(request);
  const upstream = `${buildApiBase(base)}/pets/historico/${encodeURIComponent(histId)}/arquivo`;
  const r = await fetch(upstream, { headers: { ...auth } });
  if (!r.ok) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: r.status });
  const buf = Buffer.from(await r.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': r.headers.get('content-type') || 'application/pdf',
      'Content-Disposition': r.headers.get('content-disposition') || 'inline',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
