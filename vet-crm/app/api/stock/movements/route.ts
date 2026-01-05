import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  return proxyToBackend(request, `/stock/movements${search}`, { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, `/stock/movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

