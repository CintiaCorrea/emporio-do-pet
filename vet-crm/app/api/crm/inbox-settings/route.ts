import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, `/crm/inbox-settings`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyToBackend(request, `/crm/inbox-settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
}
