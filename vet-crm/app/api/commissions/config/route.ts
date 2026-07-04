import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, `/commissions/config`, { method: 'GET' });
}

export async function PUT(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, `/commissions/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
