import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { proxyToBackend } from '@/lib/backend-proxy';

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3333' : undefined)
  );
}

function buildApiBase(base: string) {
  const n = base.replace(/\/$/, '');
  return n.endsWith('/api') ? n : `${n}/api`;
}

async function authHeader(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return {};
  try {
    const token: any = await getToken({ req: request as any, secret });
    if (token?.accessToken) return { Authorization: `Bearer ${token.accessToken}` };
  } catch {}
  return {};
}

// A LISTA DE PROFISSIONAIS PASSA PELO REPASSADOR COMUM, QUE RENOVA O ACESSO (16/09/2026).
//
// Cintia: "a assinatura automática não está funcionando" — receita do Kiss, do Dr. Gabriel, saiu
// sem o bloco de assinatura. Esta rota tinha autenticação própria e NÃO renovava o acesso: 7 dias
// depois do login ele vence, as outras telas renovam sozinhas e seguem funcionando, e só esta
// passava a responder 401. A ficha recebia a lista vazia, não achava o veterinário, e a receita
// saía sem imagem, sem linha e sem CRMV — "do nada", uma semana depois de cada login.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/users', { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  const body = await request.text();
  const res = await fetch(`${buildApiBase(base)}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader(request)) },
    body,
  });
  const text = await res.text();
  try {
    return NextResponse.json(text ? JSON.parse(text) : null, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
