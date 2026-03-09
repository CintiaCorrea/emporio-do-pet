import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/agents/${id}/rate-limit`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/agents/${id}/rate-limit/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
