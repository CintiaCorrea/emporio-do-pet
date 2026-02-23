import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/automations/[id] - Busca uma automação específica
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/automations/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

// PATCH /api/automations/[id] - Atualiza uma automação
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();

    return proxyToBackend(request, `/automations/${id}`, {
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

// DELETE /api/automations/[id] - Remove uma automação
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return proxyToBackend(request, `/automations/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
