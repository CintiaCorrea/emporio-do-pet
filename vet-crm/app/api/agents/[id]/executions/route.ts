import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const path = `/agents/${id}/executions${queryString ? `?${queryString}` : ''}`;

  return proxyToBackend(request, path, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}
