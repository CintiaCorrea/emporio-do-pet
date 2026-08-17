import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase, buildAuthHeader } from '@/lib/backend-proxy';

// Entrega a mídia (imagem/vídeo/áudio) de uma mensagem do WhatsApp, autenticado.
// O arquivo fica PRIVADO no storage; o app baixa autenticado e repassa em binário.
// Repassa Range (206) — vídeo precisa disso pra tocar/avançar. ?download=1 baixa.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  const auth = await buildAuthHeader(request);
  const dl = request.nextUrl.searchParams.get('download');
  const upstream = `${buildApiBase(base)}/whatsapp/messages/${encodeURIComponent(id)}/media${dl ? `?download=${encodeURIComponent(dl)}` : ''}`;
  const range = request.headers.get('range');
  const r = await fetch(upstream, { headers: { ...auth, ...(range ? { Range: range } : {}) } });
  if (!(r.ok || r.status === 206)) return NextResponse.json({ error: 'Mídia não encontrada' }, { status: r.status });
  const buf = Buffer.from(await r.arrayBuffer());
  const headers: Record<string, string> = {
    'Content-Type': r.headers.get('content-type') || 'application/octet-stream',
    'Content-Disposition': r.headers.get('content-disposition') || 'inline',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=300',
    'Content-Length': String(buf.length),
  };
  const cr = r.headers.get('content-range');
  if (cr) headers['Content-Range'] = cr;
  return new NextResponse(buf, { status: r.status === 206 ? 206 : 200, headers });
}
