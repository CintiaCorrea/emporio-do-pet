import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `/financeiro/parceria/faturamentos?${qs}` : '/financeiro/parceria/faturamentos';
  return proxyToBackend(request, path, { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/financeiro/parceria/faturamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
