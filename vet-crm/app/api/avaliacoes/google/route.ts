import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function GET(request: NextRequest) { return backendProxy(request, '/avaliacoes/google'); }
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/avaliacoes/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}
