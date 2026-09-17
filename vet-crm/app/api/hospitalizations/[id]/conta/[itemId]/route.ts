import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Editar e apagar item da conta da internação pela mesma porta (construção B, 17/09/2026).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/hospitalizations/${encodeURIComponent(id)}/conta/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  return proxyToBackend(request, `/hospitalizations/${encodeURIComponent(id)}/conta/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}
