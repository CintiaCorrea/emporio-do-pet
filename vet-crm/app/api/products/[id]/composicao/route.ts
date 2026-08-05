import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/products/${encodeURIComponent(id)}/composicao`, { method: 'GET' });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/products/${encodeURIComponent(id)}/composicao`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
