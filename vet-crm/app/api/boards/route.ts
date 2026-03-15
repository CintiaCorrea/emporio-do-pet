// app/api/boards/route.ts - Proxy para backend NestJS (evita Prisma no frontend)
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildApiBase, buildAuthHeader, getBackendBaseUrl } from '@/lib/backend-proxy';

const createBoardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z
    .enum([
      'APPOINTMENT',
      'CONSULTATION',
      'HOSPITALIZATION',
      'TASK',
      'PROJECT',
      'LEAD',
      'CLIENT',
      'SALES',
    ])
    .default('APPOINTMENT'),
  description: z.string().optional().nullable(),
  color: z.string().default('bg-blue-500'),
});

function extractErrorMessage(data: any, fallback: string) {
  return (
    (data &&
      (data.error ||
        (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
        data.message)) ||
    fallback
  );
}

function normalizeBoardsSummary(input: any[]) {
  return input.map((board: any) => {
    const columns = Array.isArray(board?.columns) ? board.columns : [];

    const totalCards = columns.reduce((sum: number, col: any) => {
      const count = typeof col?._count?.cards === 'number' ? col._count.cards : Array.isArray(col?.cards) ? col.cards.length : 0;
      return sum + count;
    }, 0);

    const doneColumn = columns.find((col: any) => col?.position === 3);
    const doneCards =
      typeof doneColumn?._count?.cards === 'number'
        ? doneColumn._count.cards
        : Array.isArray(doneColumn?.cards)
          ? doneColumn.cards.length
          : 0;

    const progress = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0;

    return {
      id: board.id,
      name: board.name,
      description: board.description,
      color: board.color,
      type: board.type,
      progress,
      totalDeals: totalCards,
      favorite: board.favorite,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    };
  });
}

// GET: Listar todos os boards do usuário
export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/boards`;

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
        { error: extractErrorMessage(data, 'Erro ao carregar boards') },
        { status: upstreamResponse.status },
      );
    }

    const boards = Array.isArray(data) ? data : [];
    return NextResponse.json(normalizeBoardsSummary(boards));

  } catch (error) {
    console.error('💥 Erro ao buscar boards:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// POST: Criar um novo board
export async function POST(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const validatedData = createBoardSchema.parse(body);

    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/boards`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(validatedData),
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
        { error: extractErrorMessage(data, 'Erro ao criar board') },
        { status: upstreamResponse.status },
      );
    }

    // Retorna no formato esperado pela UI (summary)
    const created = data ? normalizeBoardsSummary([data])[0] : null;
    return NextResponse.json(created, { status: upstreamResponse.status });

  } catch (error) {
    console.error('💥 Erro completo ao criar board:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.issues }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
