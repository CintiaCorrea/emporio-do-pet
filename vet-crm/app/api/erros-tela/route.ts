import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// A tela avisando que quebrou. O corpo é repassado à mão — `proxyToBackend` não o carrega
// sozinho, e um relatório de erro que chega vazio é pior do que não ter relatório.
export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, '/erros-tela', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}

export async function GET(request: NextRequest) {
  const dia = request.nextUrl.searchParams.get('dia');
  return proxyToBackend(request, `/erros-tela${dia ? `?dia=${encodeURIComponent(dia)}` : ''}`, { method: 'GET' });
}
