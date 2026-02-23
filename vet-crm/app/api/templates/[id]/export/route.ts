import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/templates/[id]/export - Exporta um template específico
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/templates/${id}/export`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}
