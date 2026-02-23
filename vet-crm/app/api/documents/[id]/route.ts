import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

async function parseParams(params: any) {
  return typeof params?.then === 'function' ? await params : params;
}

// GET - Buscar documento por ID (via backend)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await parseParams(params);
  const id = resolved?.id;
  return proxyToBackend(request, `/documents/${id}`, { method: 'GET' });
}

// PATCH - Atualizar documento (via backend)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await parseParams(params);
  const id = resolved?.id;
  const body = await request.text();
  return proxyToBackend(request, `/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

// DELETE - Excluir documento (via backend)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await parseParams(params);
  const id = resolved?.id;
  return proxyToBackend(request, `/documents/${id}`, { method: 'DELETE' });
}
