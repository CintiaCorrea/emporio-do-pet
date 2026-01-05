import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Desconectar uma integração
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: 'ID da integração é obrigatório' },
        { status: 400 }
      );
    }

    // Mapear o integrationId para o campo correto
    const fieldMap: Record<string, string> = {
      whatsapp: 'whatsappConfig',
      openai: 'openaiConfig',
      gemini: 'geminiConfig',
      deepseek: 'deepseekConfig'
    };

    const configField = fieldMap[integrationId];
    if (!configField) {
      return NextResponse.json(
        { error: 'Integração inválida' },
        { status: 400 }
      );
    }

    // Buscar configurações existentes
    const existingSettings = await prisma.integrationSettings.findFirst({
      where: { userId: session.user.id }
    });

    if (existingSettings) {
      // Limpar a configuração específica
      await prisma.integrationSettings.update({
        where: { id: existingSettings.id },
        data: {
          [configField]: null,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Integração desconectada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao desconectar integração:', error);
    return NextResponse.json(
      { error: 'Erro ao desconectar integração' },
      { status: 500 }
    );
  }
}

