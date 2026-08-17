import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/catalogo/inventarios/${encodeURIComponent(id)}/contagem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}
