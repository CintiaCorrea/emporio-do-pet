import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/landing-pages/${id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
