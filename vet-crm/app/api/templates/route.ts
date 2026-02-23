import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/templates - Lista todos os templates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const path = `/templates${queryString ? `?${queryString}` : ''}`;

  return proxyToBackend(request, path, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/templates - Cria um novo template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return proxyToBackend(request, '/templates', {
      method: 'POST',
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
