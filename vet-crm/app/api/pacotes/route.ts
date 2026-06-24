import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search || '';
  return proxyToBackend(request, `/pacotes${qs}`, { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, `/pacotes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body || '{}' });
}
