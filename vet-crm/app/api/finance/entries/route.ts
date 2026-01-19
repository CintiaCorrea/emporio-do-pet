import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `/finance/entries?${qs}` : '/finance/entries';
  return proxyToBackend(request, path, { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/finance/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}


