import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/financeiro/contas', { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/financeiro/contas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
