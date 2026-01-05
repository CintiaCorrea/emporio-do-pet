import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const createColumnSchema = z.object({
  name: z.string().min(1, 'Nome da coluna é obrigatório'),
  color: z.string().optional(),
  position: z.number().int().min(0, 'Posição deve ser um número positivo'),
});

const updateColumnSchema = z.object({
  name: z.string().min(1, 'Nome da coluna é obrigatório').optional(),
  color: z.string().optional(),
  position: z.number().int().min(0, 'Posição deve ser um número positivo').optional(),
});

interface CustomHeaders extends Headers {
  get(name: 'x-user-id'): string | null;
}

// GET: Buscar todas as colunas de um board
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    console.log('📋 === INICIANDO GET /api/boards/[id]/columns ===', boardId);
    
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
        userId 
      }
    });

    if (!board) {
      return NextResponse.json({ 
        error: 'Board não encontrado'
      }, { status: 404 });
    }

    // Buscar colunas do board ordenadas por posição
    const columns = await prisma.kanbanColumn.findMany({
      where: { 
        boardId 
      },
      include: {
        cards: {
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
                treatments: {
                  include: {
                    product: true
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
          },
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });

    console.log(`✅ ${columns.length} colunas encontradas para o board ${boardId}`);

    return NextResponse.json(columns);

  } catch (error) {
    console.error('💥 Erro ao buscar colunas:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// POST: Criar nova coluna no board
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    console.log('🆕 === INICIANDO POST /api/boards/[id]/columns ===', boardId);
    
    // Obter userId dos headers
    const headers = request.headers as CustomHeaders;
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Não autorizado'
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createColumnSchema.parse(body);
    
    console.log('📦 Dados validados para nova coluna:', { boardId, ...validatedData });

    // Verificar se o board pertence ao usuário
    const board = await prisma.board.findFirst({
      where: { 
        id: boardId,
        userId 
      }
    });

    if (!board) {
      return NextResponse.json({ 
        error: 'Board não encontrado'
      }, { status: 404 });
    }

    // Verificar se já existe coluna com o mesmo nome no board
    const existingColumn = await prisma.kanbanColumn.findFirst({
      where: {
        boardId,
        name: validatedData.name
      }
    });

    if (existingColumn) {
      return NextResponse.json({ 
        error: 'Já existe uma coluna com este nome no board'
      }, { status: 400 });
    }

    // Verificar se já existe coluna na mesma posição
    const existingColumnAtPosition = await prisma.kanbanColumn.findFirst({
      where: {
        boardId,
        position: validatedData.position
      }
    });

    if (existingColumnAtPosition) {
      console.log(`🔄 Reorganizando colunas a partir da posição ${validatedData.position}`);
      
      // Mover todas as colunas com posição >= para baixo
      await prisma.kanbanColumn.updateMany({
        where: {
          boardId,
          position: {
            gte: validatedData.position,
          }
        },
        data: {
          position: {
            increment: 1,
          },
        },
      });
    }

    // Criar nova coluna
    const newColumn = await prisma.kanbanColumn.create({
      data: {
        name: validatedData.name,
        color: validatedData.color,
        position: validatedData.position,
        boardId,
      },
      include: {
        cards: {
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
                treatments: {
                  include: {
                    product: true
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
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    console.log('✅ Coluna criada com sucesso! ID:', newColumn.id);

    return NextResponse.json(newColumn, { status: 201 });

  } catch (error) {
    console.error('💥 Erro ao criar coluna:', error);
    
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

// PATCH: Atualizar múltiplas colunas (reordenação em lote)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    console.log('🔄 === INICIANDO PATCH /api/boards/[id]/columns ===', boardId);
    
    // Obter userId dos headers
    const headers = request.headers as CustomHeaders;
    const userId = headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Não autorizado'
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Schema para atualização em lote
    const batchUpdateSchema = z.array(
      z.object({
        id: z.string().uuid('ID da coluna inválido'),
        position: z.number().int().min(0, 'Posição deve ser um número positivo'),
        name: z.string().min(1, 'Nome da coluna é obrigatório').optional(),
        color: z.string().optional(),
      })
    );

    const validatedData = batchUpdateSchema.parse(body);
    
    console.log('📦 Dados validados para atualização em lote:', { 
      boardId, 
      columns: validatedData.length 
    });

    // Verificar se o board pertence ao usuário
    const board = await prisma.board.findFirst({
      where: { 
        id: boardId,
        userId 
      }
    });

    if (!board) {
      return NextResponse.json({ 
        error: 'Board não encontrado'
      }, { status: 404 });
    }

    // Verificar se todas as colunas pertencem ao board
    const columnIds = validatedData.map(col => col.id);
    const existingColumns = await prisma.kanbanColumn.findMany({
      where: {
        id: { in: columnIds },
        boardId
      }
    });

    if (existingColumns.length !== columnIds.length) {
      return NextResponse.json({ 
        error: 'Uma ou mais colunas não pertencem a este board'
      }, { status: 400 });
    }

    // Atualizar colunas em lote
    const updatePromises = validatedData.map(columnData =>
      prisma.kanbanColumn.update({
        where: { id: columnData.id },
        data: {
          position: columnData.position,
          ...(columnData.name && { name: columnData.name }),
          ...(columnData.color && { color: columnData.color }),
          updatedAt: new Date(),
        }
      })
    );

    await Promise.all(updatePromises);

    console.log('✅ Colunas atualizadas com sucesso!');

    // Buscar colunas atualizadas
    const updatedColumns = await prisma.kanbanColumn.findMany({
      where: { boardId },
      include: {
        cards: {
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
                treatments: {
                  include: {
                    product: true
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
          },
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });

    return NextResponse.json(updatedColumns);

  } catch (error) {
    console.error('💥 Erro ao atualizar colunas:', error);
    
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
