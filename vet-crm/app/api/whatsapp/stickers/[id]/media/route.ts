import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase, buildAuthHeader } from '@/lib/backend-proxy';

// Entrega o arquivo de uma figurinha da biblioteca (bucket privado → baixa autenticado e repassa).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  const auth = await buildAuthHeader(request);
  const upstream = `${buildApiBase(base)}/whatsapp/stickers/${encodeURIComponent(id)}/media`;
  const r = await fetch(upstream, { headers: { ...auth } });
  if (!r.ok) return NextResponse.json({ error: 'Figurinha não encontrada' }, { status: r.status });
  const buf = Buffer.from(await r.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': r.headers.get('content-type') || 'image/webp',
      'Cache-Control': 'private, max-age=3600',
      'Content-Length': String(buf.length),
    },
  });
}
