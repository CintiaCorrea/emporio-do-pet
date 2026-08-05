import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

// Rota PÚBLICA (sem login) — redefine a senha usando o token do e-mail.
export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => '');
  const base = buildApiBase(getBackendBaseUrl() || '');
  try {
    const r = await fetch(`${base}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body || '{}',
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ message: 'Não foi possível redefinir agora. Tente de novo.' }, { status: 502 });
  }
}
