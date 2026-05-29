import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

function backendUrl() {
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
}

function apiBase(base: string) {
  const n = base.replace(/\/$/, '');
  return n.endsWith('/api') ? n : `${n}/api`;
}

export async function POST(request: NextRequest) {
  const base = backendUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });

  const secret = process.env.NEXTAUTH_SECRET;
  let bearer: Record<string, string> = {};
  if (secret) {
    try {
      const token: any = await getToken({ req: request as any, secret });
      if (token?.accessToken) bearer = { Authorization: `Bearer ${token.accessToken}` };
    } catch {}
  }

  const body = await request.text();
  const res = await fetch(`${apiBase(base)}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...bearer },
    body,
  });
  const text = await res.text();
  try {
    return NextResponse.json(text ? JSON.parse(text) : null, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
