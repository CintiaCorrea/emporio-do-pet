import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/profissionais/${id}`);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return backendProxy(request, `/profissionais/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/profissionais/${id}`, { method: 'DELETE' });
}
