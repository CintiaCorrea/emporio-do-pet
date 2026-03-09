import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

type JwtTokenLike = {
  accessToken?: unknown;
  refreshToken?: unknown;
};

export function getBackendBaseUrl() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3333' : undefined)
  );
}

export function buildApiBase(backendBaseUrl: string) {
  const normalized = backendBaseUrl.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

async function readAuthToken(request: NextRequest): Promise<JwtTokenLike | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const token = await getToken({
      req: request as any,
      secret,
    });
    return token as JwtTokenLike | null;
  } catch {
    return null;
  }
}

async function refreshBackendAccessToken(
  backendBaseUrl: string,
  refreshToken: string,
): Promise<string | undefined> {
  const refreshUrl = `${buildApiBase(backendBaseUrl)}/auth/refresh`;
  try {
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return undefined;

    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return typeof data?.accessToken === 'string' ? data.accessToken : undefined;
  } catch {
    return undefined;
  }
}

export async function buildAuthHeader(request: NextRequest): Promise<Record<string, string>> {
  const token = await readAuthToken(request);

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
  const token = await readAuthToken(request);
  const upstreamUrl = `${buildApiBase(backendBaseUrl)}${upstreamPath}`;

  try {
    let upstreamResponse = await fetch(upstreamUrl, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...authHeader,
      },
    });

    // If backend access token expired, try one-time refresh and retry.
    if (
      upstreamResponse.status === 401 &&
      token?.refreshToken &&
      typeof token.refreshToken === 'string'
    ) {
      const refreshedAccessToken = await refreshBackendAccessToken(
        backendBaseUrl,
        token.refreshToken,
      );

      if (refreshedAccessToken) {
        upstreamResponse = await fetch(upstreamUrl, {
          ...init,
          headers: {
            ...(init?.headers || {}),
            Authorization: `Bearer ${refreshedAccessToken}`,
          },
        });
      }
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';
    const raw = await upstreamResponse.text();

    let data: any = null;
    const shouldTryJson =
      contentType.includes('application/json') ||
      contentType.includes('+json') ||
      contentType.includes('text/json') ||
      contentType === '';

    if (!raw) {
      data = null;
    } else if (shouldTryJson) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }
    } else {
      // quando backend retorna HTML/texto
      data = raw;
    }

    if (!upstreamResponse.ok) {
      const message =
        (data &&
          (data.error ||
            (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
            data.message)) ||
        upstreamResponse.statusText ||
        'Erro ao processar requisição';

      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    return NextResponse.json(data, { status: upstreamResponse.status });
  } catch (error) {
    // Se o fetch falhar (backend offline, connection refused, etc.), garanta resposta JSON
    return NextResponse.json(
      { error: 'Falha ao conectar ao backend' },
      { status: 502 }
    );
  }
}

// Alias for backward compatibility — many route files import this name
export const backendProxy = proxyToBackend;
