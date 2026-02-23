import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/templates/[id] - Busca um template específico
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/templates/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

// PATCH /api/templates/[id] - Atualiza um template
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();

    return proxyToBackend(request, `/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Dados inválidos' },
      { status: 400 }
    );
  }
}

// DELETE /api/templates/[id] - Remove um template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/templates/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
