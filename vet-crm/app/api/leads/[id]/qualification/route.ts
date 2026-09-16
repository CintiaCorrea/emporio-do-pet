import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { cabecalhoComAcessoValido } from '@/lib/backend-proxy';

function backendUrl() {
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
}
function apiBase(b: string) { const n = b.replace(/\/$/, ''); return n.endsWith('/api') ? n : `${n}/api`; }
async function authHeader(req: NextRequest) {
  // Renova o acesso vencido antes de mandar (lib/backend-proxy).
  return cabecalhoComAcessoValido(req);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const base = backendUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  const { id } = await params;
  const body = await request.text();
  const res = await fetch(`${apiBase(base)}/leads/${id}/qualification`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeader(request)) },
    body,
  });
  const text = await res.text();
  try { return NextResponse.json(text ? JSON.parse(text) : null, { status: res.status }); }
  catch { return new NextResponse(text, { status: res.status }); }
}
