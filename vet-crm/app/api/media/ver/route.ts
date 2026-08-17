import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase, buildAuthHeader } from '@/lib/backend-proxy';

// Serve um arquivo PRIVADO do bucket (PDF/imagem anexado na ficha) de forma autenticada.
// O app baixa do backend (que assina com SigV4) e repassa só pra quem está logado.
export async function GET(request: NextRequest) {
  const u = new URL(request.url).searchParams.get('u');
  if (!u) return NextResponse.json({ error: 'sem arquivo' }, { status: 400 });
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  const auth = await buildAuthHeader(request);
  const upstream = `${buildApiBase(base)}/media/ver?u=${encodeURIComponent(u)}`;
  const r = await fetch(upstream, { headers: { ...auth }, redirect: 'manual' });
  // Link EXTERNO (Drive, etc.): o backend responde 3xx → manda o navegador direto pra lá.
  if (r.status >= 300 && r.status < 400) {
    const loc = r.headers.get('location');
    if (loc) return NextResponse.redirect(loc);
  }
  if (!r.ok) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: r.status });
  const buf = Buffer.from(await r.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': r.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': r.headers.get('content-disposition') || 'inline',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
