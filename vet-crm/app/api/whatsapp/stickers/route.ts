import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend, getBackendBaseUrl, buildApiBase, buildAuthHeader } from '@/lib/backend-proxy';

// Lista as figurinhas da biblioteca.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/whatsapp/stickers', { method: 'GET' });
}

// Sobe uma figurinha (.webp, já convertida no navegador). Repassa o multipart intacto.
export async function POST(request: NextRequest) {
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });

  const auth = await buildAuthHeader(request);
  if (!auth.Authorization) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const upstream = `${buildApiBase(base)}/whatsapp/stickers`;
  try {
    const r = await fetch(upstream, {
      method: 'POST',
      headers: { ...auth, 'content-type': request.headers.get('content-type') || 'application/octet-stream' },
      body: request.body,
      duplex: 'half',
    } as any);
    const texto = await r.text();
    let dado: any;
    try { dado = JSON.parse(texto); } catch { dado = { error: texto || 'Resposta inesperada' }; }
    return NextResponse.json(dado, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao subir a figurinha' }, { status: 502 });
  }
}
