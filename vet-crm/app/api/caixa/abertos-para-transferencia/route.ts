import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Caixas abertos (id/nº/operador) pro seletor de destino da transferência entre caixas.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/caixa/abertos-para-transferencia', { method: 'GET' });
}
