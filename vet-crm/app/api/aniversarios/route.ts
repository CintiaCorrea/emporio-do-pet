import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  return proxyToBackend(request, `/aniversarios${search}`, { method: 'GET' });
}
