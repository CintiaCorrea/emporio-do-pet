import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

// Rota PÚBLICA (sem login) — pede o link de redefinição de senha ao backend.
export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => '');
  const base = buildApiBase(getBackendBaseUrl() || '');
  try {
    const r = await fetch(`${base}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body || '{}',
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    // Não revela erro específico — resposta neutra.
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
