import { NextRequest, NextResponse } from 'next/server';
import { chamarPortal, limparSessao } from '@/lib/portal-proxy';

export async function POST(request: NextRequest) {
  // Derruba a sessao no banco e apaga o cookie do aparelho.
  await chamarPortal(request, '/portal/auth/sair', { method: 'POST' });
  return limparSessao(NextResponse.json({ ok: true }));
}
