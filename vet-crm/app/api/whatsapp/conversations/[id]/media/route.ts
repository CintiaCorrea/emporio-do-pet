import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase, buildAuthHeader } from '@/lib/backend-proxy';

// Envia um ANEXO (foto, documento, vídeo, figurinha) numa conversa do WhatsApp.
// Repassa o multipart intacto — o proxy padrão lê o corpo como texto e corromperia
// o arquivo.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });

  const auth = await buildAuthHeader(request);
  if (!auth.Authorization) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const upstream = `${buildApiBase(base)}/whatsapp/conversations/${encodeURIComponent(id)}/media`;

  try {
    const form = await request.formData();
    // Sem Content-Type manual: o fetch monta o boundary do multipart sozinho.
    const r = await fetch(upstream, { method: 'POST', headers: { ...auth }, body: form });
    const texto = await r.text();
    let dado: any;
    try { dado = JSON.parse(texto); } catch { dado = { error: texto || 'Resposta inesperada' }; }
    return NextResponse.json(dado, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ error: `Falha ao enviar o anexo: ${e?.message || e}` }, { status: 500 });
  }
}
