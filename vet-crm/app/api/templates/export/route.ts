import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// POST /api/templates/export - Exporta múltiplos templates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    return proxyToBackend(request, '/templates/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao exportar templates' },
      { status: 400 }
    );
  }
}
