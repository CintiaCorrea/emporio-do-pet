import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

// Rota PÚBLICA (cliente sem login) — encaminha o cadastro pro backend público /public/cadastro.
export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => '');
  const base = buildApiBase(getBackendBaseUrl() || '');
  try {
    const r = await fetch(`${base}/public/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body || '{}',
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ ok: false, message: 'Não foi possível enviar. Tente de novo.' }, { status: 502 });
  }
}
