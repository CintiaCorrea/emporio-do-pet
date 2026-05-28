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

function buildApiBase(backendBaseUrl: string) {
  const normalized = backendBaseUrl.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

async function buildAuthHeader(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return {};
  let token: any = null;
  try {
    token = await getToken({ req: request as any, secret });
  } catch {
    return {};
  }
  if (token?.accessToken && typeof token.accessToken === 'string') {
    return { Authorization: `Bearer ${token.accessToken}` };
  }
  return {};
}

export async function GET(request: NextRequest) {
  try {
    const backend = getBackendBaseUrl();
    if (!backend) {
      return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
    }
    const url = new URL(request.url);
    const upstream = new URL(`${buildApiBase(backend)}/inbox/recepcao`);
    url.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));
    const headers = await buildAuthHeader(request);
    const res = await fetch(upstream.toString(), { headers });
    const raw = await res.text();
    let data: any;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('Inbox recepção proxy erro:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
