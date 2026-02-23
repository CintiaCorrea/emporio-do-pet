import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/clinical-documents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const path = `/clinical-documents${queryString ? `?${queryString}` : ''}`;

  return proxyToBackend(request, path, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/clinical-documents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyToBackend(request, '/clinical-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
}
