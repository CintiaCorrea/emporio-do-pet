import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `/dashboard/summary?${qs}` : '/dashboard/summary';
  return proxyToBackend(request, path, { method: 'GET' });
}
