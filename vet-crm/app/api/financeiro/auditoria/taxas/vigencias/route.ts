import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/financeiro/auditoria/taxas/vigencias', { method: 'GET' });
}
