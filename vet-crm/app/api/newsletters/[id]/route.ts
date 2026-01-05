import { NextRequest, NextResponse } from 'next/server';
import { buildApiBase, buildAuthHeader, getBackendBaseUrl } from '@/lib/backend-proxy';

function extractErrorMessage(data: any, fallback: string) {
  return (
    (data &&
      (data.error ||
        (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
        data.message)) ||
    fallback
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'ID da newsletter é obrigatório' }, { status: 400 });
    }

    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/newsletters/${id}`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'DELETE',
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
      return NextResponse.json(
        { error: extractErrorMessage(data, 'Erro ao excluir newsletter') },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(data ?? { success: true, message: 'Newsletter deletada com sucesso', id }, { status: upstreamResponse.status });

  } catch (error) {
    console.error('Erro ao deletar newsletter:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor ao deletar newsletter' 
      },
      { status: 500 }
    );
  }
}

// Também adicione outros métodos se necessário
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da newsletter é obrigatório' },
        { status: 400 }
      );
    }

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/newsletters/${id}`;

    const upstreamResponse = await fetch(upstreamUrl, {
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
      return NextResponse.json(
        { error: extractErrorMessage(data, 'Erro ao buscar newsletter') },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json({ newsletter: data }, { status: upstreamResponse.status });
  } catch (error) {
    console.error('Erro ao buscar newsletter:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
