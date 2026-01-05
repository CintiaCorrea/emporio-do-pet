import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export function getBackendBaseUrl() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : undefined)
  );
}

export function buildApiBase(backendBaseUrl: string) {
  const normalized = backendBaseUrl.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

export async function buildAuthHeader(request: NextRequest): Promise<Record<string, string>> {
  const token = await getToken({
    req: request as any,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token?.accessToken && typeof token.accessToken === 'string') {
    return { Authorization: `Bearer ${token.accessToken}` };
  }

  return {};
}

export async function proxyToBackend(
  request: NextRequest,
  upstreamPath: string,
  init?: RequestInit
) {
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return NextResponse.json(
      { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
      { status: 500 }
    );
  }

  const authHeader = await buildAuthHeader(request);
  const upstreamUrl = `${buildApiBase(backendBaseUrl)}${upstreamPath}`;

  const upstreamResponse = await fetch(upstreamUrl, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...authHeader,
    },
  });

  const raw = await upstreamResponse.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!upstreamResponse.ok) {
    const message =
      (data &&
        (data.error ||
          (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
          data.message)) ||
      'Erro ao processar requisição';

    return NextResponse.json({ error: message }, { status: upstreamResponse.status });
  }

  return NextResponse.json(data, { status: upstreamResponse.status });
}


