import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Lista de funcionários (admin) — pro seletor de "enviar documento/holerite pra alguém".
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/rh/funcionarios', { method: 'GET' });
}
