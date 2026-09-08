import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Quem já teve caixa — alimenta o filtro por operador da grade.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, `/caixa/operadores`, { method: 'GET' });
}
