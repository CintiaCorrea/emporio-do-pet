import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// POST /api/clinical-documents/generate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyToBackend(request, '/clinical-documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
}
