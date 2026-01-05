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

function computeProgress(board: any) {
  const columns = Array.isArray(board?.columns) ? board.columns : [];
  const totalCards = columns.reduce((sum: number, col: any) => sum + (Array.isArray(col?.cards) ? col.cards.length : 0), 0);
  const doneColumn = columns.find((col: any) => col?.position === 3);
  const doneCards = doneColumn && Array.isArray(doneColumn.cards) ? doneColumn.cards.length : 0;
  const progress = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0;
  return { progress, totalDeals: totalCards };
}

// GET: Buscar um board específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/boards/${boardId}`;

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
        { error: extractErrorMessage(data, 'Erro ao carregar board') },
        { status: upstreamResponse.status },
      );
    }

    const { progress, totalDeals } = computeProgress(data);
    return NextResponse.json({
      ...data,
      progress,
      totalDeals,
    });

  } catch (error) {
    console.error('💥 Erro ao buscar board:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// PATCH: Atualizar board (favorito, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/boards/${boardId}`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'PATCH',
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
      return NextResponse.json(
        { error: extractErrorMessage(data, 'Erro ao atualizar board') },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(data, { status: upstreamResponse.status });

  } catch (error) {
    console.error('💥 Erro ao atualizar board:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// DELETE: Excluir board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/boards/${boardId}`;

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
        { error: extractErrorMessage(data, 'Erro ao excluir board') },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(data ?? { message: 'Board excluído com sucesso' }, { status: upstreamResponse.status });

  } catch (error) {
    console.error('💥 Erro ao excluir board:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
