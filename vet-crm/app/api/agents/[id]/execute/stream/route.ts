import { NextRequest, NextResponse } from 'next/server';
import { buildAuthHeader, getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return NextResponse.json(
      { error: 'Backend não configurado' },
      { status: 500 }
    );
  }

  const authHeader = await buildAuthHeader(request);
  if (!authHeader.Authorization) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/agents/${id}/execute/stream`;

    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro no serviço' }));
      return NextResponse.json(
        { error: error.message || error.error || 'Erro ao executar agente' },
        { status: response.status }
      );
    }

    if (!response.body) {
      return NextResponse.json({ error: 'Stream não disponível' }, { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao conectar com o serviço de streaming' },
      { status: 500 }
    );
  }
}
