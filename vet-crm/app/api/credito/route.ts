import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, `/credito`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body || '{}' });
}
