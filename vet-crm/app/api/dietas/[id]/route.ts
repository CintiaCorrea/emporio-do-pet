import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface Rota {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Rota) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/dietas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
