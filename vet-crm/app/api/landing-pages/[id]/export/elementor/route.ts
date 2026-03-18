import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/landing-pages/${id}/export/elementor`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}
