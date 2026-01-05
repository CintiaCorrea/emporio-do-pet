import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Schema de validação para criação de coluna
const createColumnSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  position: z.number().int().min(1, 'Posição deve ser um número inteiro positivo'),
  color: z.string().optional(),
  boardId: z.string().uuid('ID do board inválido'),
});

// GET: Listar todas as colunas de um board específico
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'ID do board é obrigatório' }, { status: 400 });
    }

    // Verificar se o board pertence ao usuário
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 });
    }

    if (board.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const columns = await prisma.kanbanColumn.findMany({
      where: { boardId },
      include: {
        cards: {
          include: {
            appointment: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(columns);
  } catch (error) {
    console.error('Erro ao listar colunas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Criar uma nova coluna
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createColumnSchema.parse(body);

    // Verificar se o board pertence ao usuário
    const board = await prisma.board.findUnique({
      where: { id: validatedData.boardId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 });
    }

    if (board.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    // Verificar unicidade do nome e posição no board
    const existingColumn = await prisma.kanbanColumn.findFirst({
      where: {
        OR: [
          { boardId: validatedData.boardId, name: validatedData.name },
          { boardId: validatedData.boardId, position: validatedData.position },
        ],
      },
    });

    if (existingColumn) {
      const errorMessage =
        existingColumn.name === validatedData.name
          ? 'Já existe uma coluna com este nome no board'
          : 'Já existe uma coluna com esta posição no board';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const column = await prisma.kanbanColumn.create({
      data: validatedData,
      include: { cards: true },
    });

    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Erro ao criar coluna:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
