import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// POST /api/templates/import - Importa templates de JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return proxyToBackend(request, '/templates/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao importar templates' },
      { status: 400 }
    );
  }
}
