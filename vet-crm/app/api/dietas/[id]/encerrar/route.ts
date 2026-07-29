import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface Rota {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Rota) {
  const { id } = await params;
  return proxyToBackend(request, `/dietas/${id}/encerrar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
}
