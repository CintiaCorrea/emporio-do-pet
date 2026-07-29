import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface Rota {
  params: Promise<{ petId: string }>;
}

export async function GET(request: NextRequest, { params }: Rota) {
  const { petId } = await params;
  return proxyToBackend(request, `/dietas/pet/${petId}`, { method: 'GET' });
}

export async function POST(request: NextRequest, { params }: Rota) {
  const { petId } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/dietas/pet/${petId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
