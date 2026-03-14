import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToBackend(request, `/knowledge-bases/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    return proxyToBackend(request, `/knowledge-bases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToBackend(request, `/knowledge-bases/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
