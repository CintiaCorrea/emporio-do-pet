import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/automations/[id]/stats - Busca estatísticas da automação
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/automations/${id}/stats`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}
