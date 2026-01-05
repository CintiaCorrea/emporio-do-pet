import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

// Schema de validação para atualização parcial de coluna
const updateColumnSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  position: z.number().int().min(0, 'Posição deve ser um número inteiro não negativo').optional(),
  color: z.string().optional(),
});

interface CustomHeaders extends Headers {
  get(name: 'x-user-id'): string | null;
  get(name: 'x-user-email'): string | null;
  get(name: 'x-user-role'): string | null;
}

// PUT: Atualização completa da coluna (para renomear)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: columnId } = await params;
    console.log('🔄 === INICIANDO PUT /api/columns/[id] ===', columnId);
    
    // Obter userId dos headers
    const headers = request.headers as CustomHeaders;
    const userId = headers.get('x-user-id');
    
    console.log('👤 UserId dos headers:', userId);

    if (!userId) {
      console.log('❌ ERRO: Headers de autenticação não encontrados');
      return NextResponse.json({ 
        error: 'Não autorizado - faça login novamente',
        details: 'Headers de autenticação não encontrados'
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateColumnSchema.parse(body);

    console.log('📦 Dados recebidos para atualização (PUT):', validatedData);

    // Buscar coluna com board para verificar permissão
    const column = await prisma.kanbanColumn.findUnique({
      where: { id: columnId },
      include: { 
        board: {
          select: {
            id: true,
            userId: true
          }
        }
      },
    });

    if (!column) {
      console.log('❌ Coluna não encontrada:', columnId);
      return NextResponse.json({ 
        error: 'Coluna não encontrada' 
      }, { status: 404 });
    }

    console.log('📋 Coluna encontrada:', {
      id: column.id,
      name: column.name,
      position: column.position,
      boardId: column.boardId,
      boardUserId: column.board.userId
    });

    // Verificar se o board pertence ao usuário
    if (column.board.userId !== userId) {
      console.log('❌ Acesso negado:', {
        boardUserId: column.board.userId,
        tokenUserId: userId
      });
      return NextResponse.json({ 
        error: 'Acesso não autorizado',
        details: 'Esta coluna não pertence ao seu usuário'
      }, { status: 403 });
    }

    // Verificar unicidade do nome (se fornecido)
    if (validatedData.name && validatedData.name !== column.name) {
      const existingColumnWithName = await prisma.kanbanColumn.findFirst({
        where: {
          boardId: column.boardId,
          name: validatedData.name,
          id: { not: columnId },
        },
      });

      if (existingColumnWithName) {
        console.log('❌ Nome já existe:', validatedData.name);
        return NextResponse.json({ 
          error: 'Já existe uma coluna com este nome no board' 
        }, { status: 400 });
      }
    }

    // Atualizar a coluna
    const updatedColumn = await prisma.kanbanColumn.update({
      where: { id: columnId },
      data: validatedData,
      include: { 
        cards: {
          include: {
            appointment: {
              include: {
                tutor: {
                  select: {
                    id: true,
                    name: true,
                  }
                },
                pet: {
                  select: {
                    id: true,
                    name: true,
                  }
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    console.log('✅ Coluna atualizada com sucesso (PUT):', {
      id: updatedColumn.id,
      name: updatedColumn.name,
      position: updatedColumn.position
    });

    return NextResponse.json(updatedColumn);

  } catch (error) {
    console.error('💥 Erro ao atualizar coluna (PUT):', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dados inválidos', 
        details: error.issues 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// PATCH: Atualização parcial da coluna (incluindo posição)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: columnId } = await params;
    console.log('🔄 === INICIANDO PATCH /api/columns/[id] ===', columnId);
    
    // Obter userId dos headers
    const headers = request.headers as CustomHeaders;
    const userId = headers.get('x-user-id');
    
    console.log('👤 UserId dos headers:', userId);
    console.log('🔍 Todos os headers disponíveis:', {
      'x-user-id': headers.get('x-user-id'),
      'x-user-email': headers.get('x-user-email'),
      'x-user-role': headers.get('x-user-role'),
    });

    if (!userId) {
      console.log('❌ ERRO: Headers de autenticação não encontrados');
      return NextResponse.json({ 
        error: 'Não autorizado - faça login novamente',
        details: 'Headers de autenticação não encontrados'
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateColumnSchema.parse(body);

    console.log('📦 Dados recebidos para atualização:', validatedData);

    // Buscar coluna com board para verificar permissão
    const column = await prisma.kanbanColumn.findUnique({
      where: { id: columnId },
      include: { 
        board: {
          select: {
            id: true,
            userId: true
          }
        },
        cards: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!column) {
      console.log('❌ Coluna não encontrada:', columnId);
      return NextResponse.json({ 
        error: 'Coluna não encontrada' 
      }, { status: 404 });
    }

    console.log('📋 Coluna encontrada:', {
      id: column.id,
      name: column.name,
      position: column.position,
      boardId: column.boardId,
      boardUserId: column.board.userId
    });

    // Verificar se o board pertence ao usuário
    if (column.board.userId !== userId) {
      console.log('❌ Acesso negado:', {
        boardUserId: column.board.userId,
        tokenUserId: userId
      });
      return NextResponse.json({ 
        error: 'Acesso não autorizado',
        details: 'Esta coluna não pertence ao seu usuário'
      }, { status: 403 });
    }

    // Lógica especial para troca de posição
    if (validatedData.position !== undefined && validatedData.position !== column.position) {
      console.log(`🔄 Movendo coluna "${column.name}" da posição ${column.position} para ${validatedData.position}`);
      
      const currentPosition = column.position;
      const newPosition = validatedData.position;

      // Buscar todas as colunas do board para reorganização
      const allColumns = await prisma.kanbanColumn.findMany({
        where: {
          boardId: column.boardId,
        },
        orderBy: { position: 'asc' },
      });

      console.log(`📊 Colunas no board antes da reorganização:`, allColumns.map(col => ({
        id: col.id,
        name: col.name,
        position: col.position
      })));

      // CORREÇÃO: Usar posição temporária para evitar conflitos
      const tempPosition = -1; // Posição temporária fora do range normal

      // Mover a coluna atual para posição temporária
      await prisma.kanbanColumn.update({
        where: { id: columnId },
        data: { position: tempPosition },
      });
      console.log(`📦 Coluna "${column.name}" movida para posição temporária ${tempPosition}`);

      // Reorganizar as outras colunas
      if (newPosition > currentPosition) {
        // Movendo para baixo: decrementar colunas entre currentPosition + 1 e newPosition
        console.log(`⬇️ Movendo para baixo: posições ${currentPosition + 1} a ${newPosition} serão decrementadas`);
        
        for (let pos = currentPosition + 1; pos <= newPosition; pos++) {
          const columnToUpdate = allColumns.find(col => col.position === pos);
          if (columnToUpdate) {
            await prisma.kanbanColumn.update({
              where: { id: columnToUpdate.id },
              data: { position: pos - 1 },
            });
            console.log(`↘️ Coluna "${columnToUpdate.name}" movida de ${pos} para ${pos - 1}`);
          }
        }
      } else {
        // Movendo para cima: incrementar colunas entre newPosition e currentPosition - 1
        console.log(`⬆️ Movendo para cima: posições ${newPosition} a ${currentPosition - 1} serão incrementadas`);
        
        for (let pos = currentPosition - 1; pos >= newPosition; pos--) {
          const columnToUpdate = allColumns.find(col => col.position === pos);
          if (columnToUpdate) {
            await prisma.kanbanColumn.update({
              where: { id: columnToUpdate.id },
              data: { position: pos + 1 },
            });
            console.log(`↗️ Coluna "${columnToUpdate.name}" movida de ${pos} para ${pos + 1}`);
          }
        }
      }

      // Mover a coluna atual para a nova posição
      await prisma.kanbanColumn.update({
        where: { id: columnId },
        data: { position: newPosition },
      });
      console.log(`✅ Coluna "${column.name}" movida para posição final ${newPosition}`);
    }

    // Verificar unicidade do nome (se fornecido)
    if (validatedData.name && validatedData.name !== column.name) {
      const existingColumnWithName = await prisma.kanbanColumn.findFirst({
        where: {
          boardId: column.boardId,
          name: validatedData.name,
          id: { not: columnId },
        },
      });

      if (existingColumnWithName) {
        console.log('❌ Nome já existe:', validatedData.name);
        return NextResponse.json({ 
          error: 'Já existe uma coluna com este nome no board' 
        }, { status: 400 });
      }
    }

    // Se não estamos movendo posição, apenas atualizar outros campos
    if (validatedData.position === undefined || validatedData.position === column.position) {
      const updatedColumn = await prisma.kanbanColumn.update({
        where: { id: columnId },
        data: validatedData,
        include: { 
          cards: {
            include: {
              appointment: {
                include: {
                  tutor: {
                    select: {
                      id: true,
                      name: true,
                    }
                  },
                  pet: {
                    select: {
                      id: true,
                      name: true,
                    }
                  },
                },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      });

      console.log('✅ Coluna atualizada com sucesso:', {
        id: updatedColumn.id,
        name: updatedColumn.name,
        position: updatedColumn.position
      });

      return NextResponse.json(updatedColumn);
    } else {
      // Se movemos a posição, buscar a coluna atualizada
      const updatedColumn = await prisma.kanbanColumn.findUnique({
        where: { id: columnId },
        include: { 
          cards: {
            include: {
              appointment: {
                include: {
                  tutor: {
                    select: {
                      id: true,
                      name: true,
                    }
                  },
                  pet: {
                    select: {
                      id: true,
                      name: true,
                    }
                  },
                },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      });

      console.log('✅ Coluna movida com sucesso:', {
        id: updatedColumn?.id,
        name: updatedColumn?.name,
        position: updatedColumn?.position
      });

      return NextResponse.json(updatedColumn);
    }

  } catch (error) {
    console.error('💥 Erro ao atualizar coluna:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dados inválidos', 
        details: error.issues 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// GET: Obter detalhes de uma coluna específica
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: columnId } = await params;
    console.log('📋 === INICIANDO GET /api/columns/[id] ===', columnId);
    
    // Obter userId dos headers
    const headers = request.headers as CustomHeaders;
    const userId = headers.get('x-user-id');
    
    console.log('👤 UserId dos headers:', userId);

    if (!userId) {
      console.log('❌ ERRO: Headers de autenticação não encontrados');
      return NextResponse.json({ 
        error: 'Não autorizado - faça login novamente'
      }, { status: 401 });
    }

    const column = await prisma.kanbanColumn.findUnique({
      where: { id: columnId },
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
                  }
                },
                treatments: {
                  include: {
                    product: true
                  }
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        board: {
          select: {
            id: true,
            userId: true,
            name: true
          }
        },
      },
    });

    if (!column) {
      console.log('❌ Coluna não encontrada:', columnId);
      return NextResponse.json({ 
        error: 'Coluna não encontrada' 
      }, { status: 404 });
    }

    // Verificar se o board pertence ao usuário
    if (column.board.userId !== userId) {
      console.log('❌ Acesso negado:', {
        boardUserId: column.board.userId,
        tokenUserId: userId
      });
      return NextResponse.json({ 
        error: 'Acesso não autorizado'
      }, { status: 403 });
    }

    console.log(`📦 Coluna encontrada: ${column.name} (${column.cards.length} cards)`);

    return NextResponse.json(column);

  } catch (error) {
    console.error('💥 Erro ao buscar coluna:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// DELETE: Excluir uma coluna
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: columnId } = await params;
    console.log('🗑️ === INICIANDO DELETE /api/columns/[id] ===', columnId);
    
    // Obter userId dos headers
    const headers = request.headers as CustomHeaders;
    const userId = headers.get('x-user-id');
    
    console.log('👤 UserId dos headers:', userId);

    if (!userId) {
      console.log('❌ ERRO: Headers de autenticação não encontrados');
      return NextResponse.json({ 
        error: 'Não autorizado - faça login novamente'
      }, { status: 401 });
    }

    // Buscar coluna com board para verificar permissão
    const column = await prisma.kanbanColumn.findUnique({
      where: { id: columnId },
      include: { 
        board: {
          select: {
            id: true,
            userId: true
          }
        },
        cards: {
          include: {
            appointment: true
          }
        }
      },
    });

    if (!column) {
      console.log('❌ Coluna não encontrada:', columnId);
      return NextResponse.json({ 
        error: 'Coluna não encontrada' 
      }, { status: 404 });
    }

    // Verificar se o board pertence ao usuário
    if (column.board.userId !== userId) {
      console.log('❌ Acesso negado:', {
        boardUserId: column.board.userId,
        tokenUserId: userId
      });
      return NextResponse.json({ 
        error: 'Acesso não autorizado'
      }, { status: 403 });
    }

    console.log(`🗑️ Excluindo coluna "${column.name}" com ${column.cards.length} cards`);

    // CORREÇÃO: Abordagem mais simples e eficiente sem transação longa
    const deletedPosition = column.position;
    const boardId = column.boardId;

    // Buscar todas as colunas do board antes da exclusão
    const allColumnsBefore = await prisma.kanbanColumn.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });

    console.log(`📊 Colunas antes da exclusão:`, allColumnsBefore.map(col => ({
      id: col.id,
      name: col.name,
      position: col.position
    })));

    // 1. Primeiro, excluir a coluna
    await prisma.kanbanColumn.delete({
      where: { id: columnId },
    });

    console.log(`✅ Coluna "${column.name}" excluída da posição ${deletedPosition}`);

    // 2. Buscar colunas restantes após exclusão
    const remainingColumns = await prisma.kanbanColumn.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });

    console.log(`📊 Colunas restantes após exclusão:`, remainingColumns.map(col => ({
      id: col.id,
      name: col.name,
      position: col.position
    })));

    // 3. Reorganizar posições usando uma única operação de atualização em lote
    if (remainingColumns.length > 0) {
      console.log('🔄 Reorganizando posições das colunas restantes...');
      
      // Criar array de promessas de atualização
      const updatePromises = remainingColumns.map((col, index) => {
        console.log(`📝 Agendando atualização: "${col.name}" de ${col.position} para ${index}`);
        return prisma.kanbanColumn.update({
          where: { id: col.id },
          data: { position: index },
        });
      });

      // Executar todas as atualizações em paralelo
      await Promise.all(updatePromises);
      console.log('✅ Todas as colunas reorganizadas com sucesso');
    }

    // 4. Buscar colunas atualizadas para retorno
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
                  }
                },
                pet: {
                  select: {
                    id: true,
                    name: true,
                  }
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });

    console.log('✅ Exclusão e reorganização concluídas com sucesso');

    return NextResponse.json({ 
      message: 'Coluna excluída com sucesso',
      deletedColumn: {
        id: columnId,
        name: column.name
      },
      updatedColumns
    });

  } catch (error) {
    console.error('💥 Erro ao excluir coluna:', error);
    
    // Log mais detalhado do erro do Prisma
    if (error instanceof Error && 'code' in error) {
      console.error('🔍 Código do erro Prisma:', (error as any).code);
      console.error('🔍 Meta do erro Prisma:', (error as any).meta);
      
      // Tratamento específico para erro de constraint única
      if ((error as any).code === 'P2002') {
        return NextResponse.json({ 
          error: 'Conflito de posição durante a reorganização',
          details: 'Tente novamente ou recarregue a página'
        }, { status: 409 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
