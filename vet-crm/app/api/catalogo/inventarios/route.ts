import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/catalogo/inventarios', { method: 'GET' });
}
export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/catalogo/inventarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
}
