import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const createAppointmentSchema = z.object({
  // Dados do agendamento
  tutorId: z.string().uuid('ID do tutor é obrigatório'),
  petId: z.string().uuid('ID do pet é obrigatório'),
  userId: z.string().uuid('ID do veterinário é obrigatório'),
  date: z.string().datetime('Data inválida'),
  duration: z.number().int().min(15).max(240).default(30),
  description: z.string().optional(),
  notes: z.string().optional(),
  value: z.number().min(0).default(0),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELED', 'CONFIRMED', 'IN_PROGRESS']).default('SCHEDULED'),
  paymentStatus: z.enum(['PAID', 'PENDING', 'OVERDUE', 'CANCELLED']).default('PENDING'),
  
  // Dados do card no kanban
  columnId: z.string().uuid('ID da coluna é obrigatório'),
  title: z.string().min(1, 'Título do card é obrigatório'),
});

interface CustomHeaders extends Headers {
  get(name: 'x-user-id'): string | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    console.log('📅 === INICIANDO POST /api/boards/[id]/appointments ===', boardId);
    
    // Obter userId dos headers
    const headers = request.headers as CustomHeaders;
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Não autorizado'
      }, { status: 401 });
    }

    // Verificar se o board pertence ao usuário
    const board = await prisma.board.findFirst({
      where: { 
        id: boardId,
        userId: userId 
      },
      include: {
        columns: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!board) {
      return NextResponse.json({ 
        error: 'Board não encontrado'
      }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createAppointmentSchema.parse(body);

    // Verificar se a coluna pertence ao board
    const column = await prisma.kanbanColumn.findFirst({
      where: {
        id: validatedData.columnId,
        boardId: boardId
      }
    });

    if (!column) {
      return NextResponse.json({ 
        error: 'Coluna não encontrada neste board'
      }, { status: 400 });
    }

    // Verificar se tutor e pet existem
    const tutor = await prisma.tutor.findFirst({
      where: { id: validatedData.tutorId }
    });

    if (!tutor) {
      return NextResponse.json({ 
        error: 'Tutor não encontrado'
      }, { status: 400 });
    }

    const pet = await prisma.pet.findFirst({
      where: { 
        id: validatedData.petId,
        tutorId: validatedData.tutorId
      }
    });

    if (!pet) {
      return NextResponse.json({ 
        error: 'Pet não encontrado ou não pertence ao tutor'
      }, { status: 400 });
    }

    // Verificar se veterinário existe
    const veterinarian = await prisma.user.findFirst({
      where: { id: validatedData.userId }
    });

    if (!veterinarian) {
      return NextResponse.json({ 
        error: 'Veterinário não encontrado'
      }, { status: 400 });
    }

    // Criar agendamento e card em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar o agendamento
      const appointment = await tx.appointment.create({
        data: {
          tutorId: validatedData.tutorId,
          petId: validatedData.petId,
          userId: validatedData.userId,
          boardId: boardId,
          date: new Date(validatedData.date),
          duration: validatedData.duration,
          description: validatedData.description,
          notes: validatedData.notes,
          value: validatedData.value,
          status: validatedData.status,
          paymentStatus: validatedData.paymentStatus,
        },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              contacts: {
                where: { isPrimary: true },
                take: 1
              }
            }
          },
          pet: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // 2. Contar cards existentes na coluna para determinar a posição
      const cardCount = await tx.kanbanCard.count({
        where: { columnId: validatedData.columnId }
      });

      // 3. Criar o card no kanban
      const card = await tx.kanbanCard.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          position: cardCount,
          columnId: validatedData.columnId,
          appointmentId: appointment.id,
        },
        include: {
          appointment: {
            include: {
              tutor: {
                select: {
                  id: true,
                  name: true,
                  contacts: {
                    where: { isPrimary: true },
                    take: 1
                  }
                }
              },
              pet: {
                select: {
                  id: true,
                  name: true,
                  species: true,
                  breed: true
                }
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      return { appointment, card };
    });

    console.log('✅ Agendamento e card criados com sucesso!');

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('💥 Erro ao criar agendamento:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dados inválidos', 
        details: error.issues 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// GET: Listar agendamentos do board
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    console.log('📋 === INICIANDO GET /api/boards/[id]/appointments ===', boardId);
    
    const headers = request.headers as CustomHeaders;
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Não autorizado'
      }, { status: 401 });
    }

    // Verificar se o board pertence ao usuário
    const board = await prisma.board.findFirst({
      where: { 
        id: boardId,
        userId: userId 
      }
    });

    if (!board) {
      return NextResponse.json({ 
        error: 'Board não encontrado'
      }, { status: 404 });
    }

    // Buscar agendamentos do board
    const appointments = await prisma.appointment.findMany({
      where: {
        boardId: boardId
      },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: {
              where: { isPrimary: true },
              take: 1
            }
          }
        },
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        treatments: {
          include: {
            product: true
          }
        },
        kanbanCard: {
          include: {
            column: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`📦 Encontrados ${appointments.length} agendamentos no board ${boardId}`);

    return NextResponse.json(appointments);

  } catch (error) {
    console.error('💥 Erro ao buscar agendamentos:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
