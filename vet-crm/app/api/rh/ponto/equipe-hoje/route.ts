import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET: painel admin — ponto de HOJE de toda a equipe.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/rh/ponto/equipe-hoje', { method: 'GET' });
}
