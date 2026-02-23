import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/consultation-recordings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const path = `/consultation-recordings${queryString ? `?${queryString}` : ''}`;

  return proxyToBackend(request, path, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/consultation-recordings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyToBackend(request, '/consultation-recordings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
}
