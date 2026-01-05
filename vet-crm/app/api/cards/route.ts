import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Schema de validação para criação de card
const createCardSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  position: z.number().int().min(1, 'Posição deve ser um número inteiro positivo'),
  columnId: z.string().uuid('ID da coluna inválido'),
  appointmentId: z.string().uuid('ID do agendamento inválido').optional().nullable(),
  metadata: z.any().optional().nullable(), // Suporta qualquer JSON compatível com Prisma
});

// GET: Listar todas as cards de uma coluna específica
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const columnId = searchParams.get('columnId');

    if (!columnId) {
      return NextResponse.json({ error: 'ID da coluna é obrigatório' }, { status: 400 });
    }

    // Verificar se a coluna pertence a um board do usuário
    const column = await prisma.kanbanColumn.findUnique({
      where: { id: columnId },
      include: { board: true },
    });

    if (!column) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 });
    }

    if (column.board.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const cards = await prisma.kanbanCard.findMany({
      where: { columnId },
      include: {
        appointment: true,
        column: true,
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Erro ao listar cards:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Criar uma nova card
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCardSchema.parse(body);

    // Verificar se a coluna pertence a um board do usuário
    const column = await prisma.kanbanColumn.findUnique({
      where: { id: validatedData.columnId },
      include: { board: true },
    });

    if (!column) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 });
    }

    if (column.board.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    // Verificar unicidade da posição na coluna
    const existingPosition = await prisma.kanbanCard.findFirst({
      where: {
        columnId: validatedData.columnId,
        position: validatedData.position,
      },
    });

    if (existingPosition) {
      return NextResponse.json({ error: 'Já existe um card com esta posição na coluna' }, { status: 400 });
    }

    // Verificar se appointmentId existe e não está associado a outro card
    if (validatedData.appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: validatedData.appointmentId },
      });

      if (!appointment) {
        return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
      }

      const existingCardWithAppointment = await prisma.kanbanCard.findFirst({
        where: { appointmentId: validatedData.appointmentId },
      });

      if (existingCardWithAppointment) {
        return NextResponse.json({ error: 'Este agendamento já está associado a outro card' }, { status: 400 });
      }
    }

    const card = await prisma.kanbanCard.create({
      data: validatedData,
      include: {
        column: true,
        appointment: true,
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Erro ao criar card:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
