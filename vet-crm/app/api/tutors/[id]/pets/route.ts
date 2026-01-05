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
  const token = await getToken({
    req: request as any,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token?.accessToken && typeof token.accessToken === 'string') {
    return { Authorization: `Bearer ${token.accessToken}` };
  }

  return {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = params.id;

    if (!tutorId) {
      return NextResponse.json(
        { error: 'ID do tutor é obrigatório' },
        { status: 400 }
      );
    }

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const take = url.searchParams.get('take') || url.searchParams.get('limit') || '1000';

    const upstreamUrl = new URL(`${buildApiBase(backendBaseUrl)}/pets`);
    upstreamUrl.searchParams.set('tutorId', tutorId);
    upstreamUrl.searchParams.set('skip', '0');
    upstreamUrl.searchParams.set('take', take);

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
        'Erro ao buscar pets do tutor';

      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    const pets = Array.isArray(data?.pets) ? data.pets : [];
    // Compatibilidade com a rota antiga: retornar apenas pets ativos
    const activePets = pets.filter((p: any) => !p?.status || p.status === 'ACTIVE');

    return NextResponse.json(activePets);

  } catch (error) {
    console.error('Erro ao buscar pets do tutor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = params.id;
    const body = await request.json();

    if (!tutorId) {
      return NextResponse.json(
        { error: 'ID do tutor é obrigatório' },
        { status: 400 }
      );
    }

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 }
      );
    }

    // Backend cria pet em /api/pets com tutorId no body
    const authHeader = await buildAuthHeader(request);

    const upstreamResponse = await fetch(`${buildApiBase(backendBaseUrl)}/pets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        ...body,
        tutorId,
      }),
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
        'Erro ao criar pet';

      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    return NextResponse.json(data, { status: upstreamResponse.status });

  } catch (error) {
    console.error('Erro ao criar pet:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
