import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase, buildAuthHeader } from '@/lib/backend-proxy';

// Sobe um arquivo (exame, foto, documento) pro storage, autenticado.
// O proxy padrão lê o corpo como TEXTO e corromperia o arquivo — por isso este
// repassa o multipart intacto, no mesmo espírito do proxy que ENTREGA a mídia.
export async function POST(request: NextRequest) {
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });

  const auth = await buildAuthHeader(request);
  if (!auth.Authorization) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Repassa os filtros (pasta/origem) que a tela mandar
  const qs = request.nextUrl.search || '';
  const upstream = `${buildApiBase(base)}/media/upload${qs}`;

  try {
    const form = await request.formData();
    // NÃO definir Content-Type na mão: o fetch monta o boundary do multipart sozinho.
    const r = await fetch(upstream, { method: 'POST', headers: { ...auth }, body: form });
    const texto = await r.text();
    let dado: any;
    try { dado = JSON.parse(texto); } catch { dado = { error: texto || 'Resposta inesperada do servidor' }; }
    return NextResponse.json(dado, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Falha ao enviar o arquivo: ${e?.message || e}` },
      { status: 500 },
    );
  }
}
