import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string; version: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id, version } = await params;

  return proxyToBackend(request, `/agents/${id}/versions/${version}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
