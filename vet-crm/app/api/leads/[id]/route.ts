import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
// [EMP-COWORK] add PATCH -> repassa pro PUT do backend. O Inbox salva etapa/nome/telefone/resumo
// via PATCH /api/leads/:id, mas a rota só tinha GET/PUT/DELETE (PATCH dava 405 e nada salvava).

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/leads/${id}`, { method: 'GET' });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/leads/${id}`, { method: 'DELETE' });
}
