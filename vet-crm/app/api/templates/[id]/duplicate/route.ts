import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/templates/[id]/duplicate - Duplica um template
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));

    return proxyToBackend(request, `/templates/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao duplicar template' },
      { status: 400 }
    );
  }
}
