import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

export async function GET(request: NextRequest) {
  const base = getBackendBaseUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  const res = await fetch(`${buildApiBase(base)}/users`, { headers: await authHeader(request) });
  const text = await res.text();
  try {
    return NextResponse.json(text ? JSON.parse(text) : null, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
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
