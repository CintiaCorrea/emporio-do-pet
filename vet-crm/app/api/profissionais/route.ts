import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search;
  return backendProxy(request, `/profissionais${search}`);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/profissionais', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
