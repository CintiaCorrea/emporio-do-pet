import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase, buildAuthHeader } from '@/lib/backend-proxy';

// Entrega a mídia (imagem/áudio) de uma mensagem do WhatsApp, autenticado.
// O arquivo fica PRIVADO no storage; o app baixa autenticado e repassa em binário
// só pra quem está logado (o proxy padrão lê como texto e corromperia a mídia).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  const auth = await buildAuthHeader(request);
  const upstream = `${buildApiBase(base)}/whatsapp/messages/${encodeURIComponent(id)}/media`;
  const r = await fetch(upstream, { headers: { ...auth } });
  if (!r.ok) return NextResponse.json({ error: 'Mídia não encontrada' }, { status: r.status });
  const buf = Buffer.from(await r.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': r.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
