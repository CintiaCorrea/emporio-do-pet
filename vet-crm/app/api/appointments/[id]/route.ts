import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/appointments/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/appointments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/appointments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Os dois "sim, eu sei" do servidor: gravação de áudio (force) e dinheiro recebido
  // (comRecebimento). Qualquer outro parâmetro não passa.
  const sp = request.nextUrl.searchParams;
  const q = new URLSearchParams();
  if (['true', '1'].includes(String(sp.get('force')))) q.set('force', 'true');
  if (['true', '1'].includes(String(sp.get('comRecebimento')))) q.set('comRecebimento', 'true');
  const qs = q.toString() ? `?${q.toString()}` : '';
  return proxyToBackend(request, `/appointments/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' });
}
