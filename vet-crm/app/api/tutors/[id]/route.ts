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

async function parseParams(params: any) {
  // Alguns arquivos aqui usam params como Promise; suportar ambos
  return typeof params?.then === 'function' ? await params : params;
}

async function proxyToBackend(request: NextRequest, upstreamPath: string, init?: RequestInit) {
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return NextResponse.json(
      { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
      { status: 500 }
    );
  }

  const authHeader = await buildAuthHeader(request);
  const upstreamResponse = await fetch(`${buildApiBase(backendBaseUrl)}${upstreamPath}`, {
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

// GET - Buscar tutor por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await parseParams(params);
    const id = resolved?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID do tutor é obrigatório' }, { status: 400 });
    }

    return await proxyToBackend(request, `/tutors/${encodeURIComponent(id)}`, {
      method: 'GET',
    });

  } catch (error) {
    console.error('Erro ao buscar tutor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Atualização parcial do tutor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await parseParams(params);
    const id = resolved?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID do tutor é obrigatório' }, { status: 400 });
    }

    const body = await request.json();
    return await proxyToBackend(request, `/tutors/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  } catch (error) {
    console.error('Erro ao atualizar tutor:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualização completa do tutor (replace)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await parseParams(params);
    const id = resolved?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID do tutor é obrigatório' }, { status: 400 });
    }

    const body = await request.json();
    return await proxyToBackend(request, `/tutors/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  } catch (error) {
    console.error('Erro ao atualizar tutor:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Remover tutor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await parseParams(params);
    const id = resolved?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID do tutor é obrigatório' }, { status: 400 });
    }

    return await proxyToBackend(request, `/tutors/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

  } catch (error) {
    console.error('Erro ao excluir tutor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
