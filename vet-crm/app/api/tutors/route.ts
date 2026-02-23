import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : undefined)
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
    token = await getToken({
      req: request as any,
      secret,
    });
  } catch {
    return {};
  }

  if (token?.accessToken && typeof token.accessToken === 'string') {
    return { Authorization: `Bearer ${token.accessToken}` };
  }

  return {};
}

// GET - Listar tutores (proxy para NestJS)
export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const sp = url.searchParams;

    const search = sp.get('search') || undefined;

    // Aceita tanto page/limit quanto skip/take
    const takeFromQuery = sp.get('take') ? parseInt(sp.get('take') as string) : undefined;
    const skipFromQuery = sp.get('skip') ? parseInt(sp.get('skip') as string) : undefined;

    const page = sp.get('page') ? parseInt(sp.get('page') as string) : 1;
    const limit = sp.get('limit') ? parseInt(sp.get('limit') as string) : 10;

    const take = Number.isFinite(takeFromQuery as any) ? (takeFromQuery as number) : limit;
    const skip = Number.isFinite(skipFromQuery as any) ? (skipFromQuery as number) : (page - 1) * take;

    const upstreamUrl = new URL(`${buildApiBase(backendBaseUrl)}/tutors`);
    if (search) upstreamUrl.searchParams.set('search', search);
    upstreamUrl.searchParams.set('skip', String(skip));
    upstreamUrl.searchParams.set('take', String(take));

    const authHeader = await buildAuthHeader(request);

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
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
        'Erro ao buscar tutores';

      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    const tutors = Array.isArray(data?.tutors) ? data.tutors : [];
    const total = typeof data?.total === 'number' ? data.total : tutors.length;
    const effectiveSkip = typeof data?.skip === 'number' ? data.skip : skip;
    const effectiveTake = typeof data?.take === 'number' ? data.take : take;

    const effectivePage =
      effectiveTake > 0 ? Math.floor(effectiveSkip / effectiveTake) + 1 : 1;
    const pages = effectiveTake > 0 ? Math.ceil(total / effectiveTake) : 1;

    return NextResponse.json({
      tutors,
      pagination: {
        page: effectivePage,
        limit: effectiveTake,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar tutores (proxy):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar tutor (proxy para NestJS)
export async function POST(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const authHeader = await buildAuthHeader(request);

    const upstreamResponse = await fetch(`${buildApiBase(backendBaseUrl)}/tutors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(body),
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
        'Erro ao criar tutor';

      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    return NextResponse.json(data, { status: upstreamResponse.status });
  } catch (error) {
    console.error('Erro ao criar tutor (proxy):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
