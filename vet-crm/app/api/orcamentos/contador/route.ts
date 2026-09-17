import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Quantos orçamentos viraram venda, por mês (backend orcamentos/contador-de-orcamentos.regras).
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/orcamentos/contador', { method: 'GET' });
}
