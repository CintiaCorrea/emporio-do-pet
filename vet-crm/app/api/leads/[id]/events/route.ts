import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/leads/${id}/events`, { method: 'GET' });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/leads/${id}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
