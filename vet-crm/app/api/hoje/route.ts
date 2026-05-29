import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

function backendUrl() {
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
}
function apiBase(b: string) { const n = b.replace(/\/$/, ''); return n.endsWith('/api') ? n : `${n}/api`; }

export async function GET(request: NextRequest) {
  const base = backendUrl();
  if (!base) return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  const secret = process.env.NEXTAUTH_SECRET;
  let bearer: Record<string, string> = {};
  if (secret) {
    try {
      const t: any = await getToken({ req: request as any, secret });
      if (t?.accessToken) bearer = { Authorization: `Bearer ${t.accessToken}` };
    } catch {}
  }
  const res = await fetch(`${apiBase(base)}/hoje`, { headers: bearer });
  const text = await res.text();
  try { return NextResponse.json(text ? JSON.parse(text) : null, { status: res.status }); }
  catch { return new NextResponse(text, { status: res.status }); }
}
