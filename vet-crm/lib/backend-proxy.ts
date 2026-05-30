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
    (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:3333' : undefined)
  );
}

export function buildApiBase(backendBaseUrl: string) {
  const normalized = backendBaseUrl.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

function toIpv4Loopback(url: string) {
  return url.replace('://localhost', '://127.0.0.1');
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
  const fallbackUpstreamUrl = upstreamUrl.includes('://localhost')
    ? toIpv4Loopback(upstreamUrl)
    : null;

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

    if (!upstreamResponse.ok && upstreamResponse.status >= 500 && fallbackUpstreamUrl) {
      upstreamResponse = await fetch(fallbackUpstreamUrl, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          ...authHeader,
        },
      });
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
      // Repassar o body completo do backend pro frontend ver os detalhes do erro
      if (data && typeof data === 'object') {
        return NextResponse.json(data, { status: upstreamResponse.status });
      }
      const message =
        (data &&
          ((Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
            data.error)) ||
        upstreamResponse.statusText ||
        'Erro ao processar requisição';
      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    return NextResponse.json(data, { status: upstreamResponse.status });
  } catch (error) {
    if (fallbackUpstreamUrl) {
      try {
        const retryResponse = await fetch(fallbackUpstreamUrl, {
          ...init,
          headers: {
            ...(init?.headers || {}),
            ...authHeader,
          },
        });

        const contentType = retryResponse.headers.get('content-type') || '';
        const raw = await retryResponse.text();
        const shouldTryJson =
          contentType.includes('application/json') ||
          contentType.includes('+json') ||
          contentType.includes('text/json') ||
          contentType === '';

        let data: any = null;
        if (!raw) {
          data = null;
        } else if (shouldTryJson) {
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
        } else {
          data = raw;
        }

        if (!retryResponse.ok) {
          const message =
            (data &&
              (data.error ||
                (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
                data.message)) ||
            retryResponse.statusText ||
            'Erro ao processar requisição';

          // Repassar body completo do backend
          if (data && typeof data === 'object') {
            return NextResponse.json(data, { status: retryResponse.status });
          }
          return NextResponse.json({ error: message }, { status: retryResponse.status });
        }

        return NextResponse.json(data, { status: retryResponse.status });
      } catch {
        // fall through to generic 502 below
      }
    }

    // Se o fetch falhar (backend offline, connection refused, etc.), garanta resposta JSON
    return NextResponse.json({ error: 'Falha ao conectar ao backend' }, { status: 502 });
  }
}

// Alias for backward compatibility — many route files import this name
export const backendProxy = proxyToBackend;
