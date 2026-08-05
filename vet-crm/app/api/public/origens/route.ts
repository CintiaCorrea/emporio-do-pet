import { NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

// Rota PÚBLICA (sem login) — lista "Como conheceu" para o form de cadastro.
export async function GET() {
  const base = buildApiBase(getBackendBaseUrl() || '');
  try {
    const r = await fetch(`${base}/public/origens`, { cache: 'no-store' });
    const data = await r.json().catch(() => ({ origens: [] }));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ origens: [] }, { status: 200 });
  }
}
