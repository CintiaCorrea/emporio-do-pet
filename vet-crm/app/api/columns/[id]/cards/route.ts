import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Schema de validação para o parâmetro id
const paramsSchema = z.object({
  id: z.string().uuid("ID da coluna inválido"),
});

// Schema de validação para o corpo da requisição
const createCardSchema = z.object({
  title: z.string().min(1, "Título do cartão é obrigatório"),
  position: z.number().int().min(0, "A posição deve ser um número inteiro não negativo"),
  appointmentId: z.string().uuid("ID da consulta inválido").optional(),
  description: z.string().optional(),
});

// POST: Criar um novo cartão na coluna
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Validar parâmetro id
    const { id: columnId } = await paramsSchema.parseAsync(await params);

    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Validar corpo da requisição
    const body = await request.json();
    const { title, position, appointmentId, description } = createCardSchema.parse(body);

    // Verificar se a coluna existe
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
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 });
    }

    // Verificar permissão do usuário
    if (column.board.userId !== session.user.id) {
      return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
    }

    // Verificar se o appointmentId é válido (se fornecido)
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({ 
        where: { id: appointmentId },
        include: {
          tutor: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      if (!appointment) {
        return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
      }
    }

    // Criar novo cartão
    const newCard = await prisma.kanbanCard.create({
      data: {
        title,
        position,
        description,
        appointmentId,
        columnId,
      },
      include: {
        appointment: {
          include: {
            tutor: { // CORREÇÃO: Mudar 'client' para 'tutor'
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
    });

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar cartão:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
