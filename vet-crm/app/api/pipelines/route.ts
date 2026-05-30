import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function GET(request: NextRequest) { return backendProxy(request, `/pipelines${request.nextUrl.search}`); }
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/pipelines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}
