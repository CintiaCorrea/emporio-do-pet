import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface Rota {
  params: Promise<{ tutorId: string }>;
}

export async function POST(request: NextRequest, { params }: Rota) {
  const { tutorId } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/portal/admin/agenda/travados/${tutorId}/liberar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
