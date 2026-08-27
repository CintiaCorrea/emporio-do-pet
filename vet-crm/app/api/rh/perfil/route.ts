import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Perfil do funcionário logado (cabeçalho do "Meu RH").
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/rh/perfil', { method: 'GET' });
}
