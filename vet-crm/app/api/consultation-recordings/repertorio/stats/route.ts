import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/consultation-recordings/repertorio/stats — tamanho do repertório da clínica.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/consultation-recordings/repertorio/stats', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}
