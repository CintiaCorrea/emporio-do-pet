import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET: estado do ponto de HOJE do funcionário logado (status + batidas + horas).
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/rh/ponto/hoje', { method: 'GET' });
}
