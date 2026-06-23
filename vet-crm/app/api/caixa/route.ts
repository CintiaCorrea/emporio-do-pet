import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return proxyToBackend(request, `/caixa${url.search}`, { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, `/caixa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}
