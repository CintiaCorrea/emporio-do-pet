import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Anexa o laudo ao exame e move para "Resultado" — numa chamada só, de propósito: separadas, a
// gravação podia dar certo e a mudança de fase falhar, deixando o card com laudo anexado parado
// em "Retirado" e contando atraso de um exame que já voltou.
//
// O CORPO PRECISA SER REPASSADO À MÃO. `proxyToBackend` não carrega o body sozinho, e esquecer
// isso já custou caro em `exames/iniciar`: o backend recebia `{}`, criava zero exames e
// respondia `{ ok: true }`. Aqui daria "Laudo sem arquivo" — barulhento, mas sem motivo visível.
export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, `/exames/${encodeURIComponent(itemId)}/resultado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
