import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/boards/${id}/columns`, { method: 'GET' });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/boards/${id}/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

// Reordenação em lote: espera { columns: [{ id, position }] }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await request.text();
  let parsed: any = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  const body = JSON.stringify({ columns: Array.isArray(parsed) ? parsed : parsed?.columns ?? [] });
  return proxyToBackend(request, `/boards/${id}/columns`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
