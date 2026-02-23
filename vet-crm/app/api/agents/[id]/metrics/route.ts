import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/agents/[id]/metrics - Busca métricas do agente
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/agents/${id}/metrics`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}
