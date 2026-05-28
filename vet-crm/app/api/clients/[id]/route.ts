// Compat layer: rota /api/clients/* mantida temporariamente — proxy aponta pra
// /tutors no backend (Client foi unificado em Tutor com classificacao='Cliente').
// TODO: migrar UIs pra /api/tutors/* e deletar este arquivo.
import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/tutors/${id}`, { method: 'GET' });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/tutors/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/tutors/${id}`, { method: 'DELETE' });
}
