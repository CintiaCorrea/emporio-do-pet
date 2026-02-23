import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/automations/[id]/execute - Executa a automação manualmente
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/automations/${id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
