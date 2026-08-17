import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Fila de exames em andamento (Kanban).
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/exames/fila', { method: 'GET' });
}
