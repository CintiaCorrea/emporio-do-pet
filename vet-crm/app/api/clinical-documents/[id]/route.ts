import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/clinical-documents/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/clinical-documents/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT /api/clinical-documents/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    return proxyToBackend(request, `/clinical-documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
}

// DELETE /api/clinical-documents/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/clinical-documents/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
