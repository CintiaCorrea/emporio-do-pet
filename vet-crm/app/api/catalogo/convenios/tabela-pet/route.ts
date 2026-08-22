import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const qs = new URL(request.url).searchParams.toString();
  return backendProxy(request, `/catalogo/convenios/tabela-pet${qs ? `?${qs}` : ''}`, { method: 'GET' });
}
