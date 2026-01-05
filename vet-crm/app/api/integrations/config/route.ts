import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Carregar configurações de integrações
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar configurações do usuário/empresa
    const settings = await prisma.integrationSettings.findFirst({
      where: {
        userId: session.user.id
      }
    });

    if (!settings) {
      // Retornar configuração padrão se não existir
      return NextResponse.json({
        config: {
          whatsapp: {
            phoneNumberId: '',
            businessAccountId: '',
            accessToken: '',
            webhookVerifyToken: ''
          },
          openai: {
            apiKey: '',
            model: 'gpt-4-turbo-preview',
            maxTokens: 4096
          },
          gemini: {
            apiKey: '',
            model: 'gemini-pro'
          },
          deepseek: {
            apiKey: '',
            model: 'deepseek-chat',
            baseUrl: 'https://api.deepseek.com'
          }
        }
      });
    }

    // Descriptografar e retornar configurações
    const config = {
      whatsapp: settings.whatsappConfig ? JSON.parse(settings.whatsappConfig as string) : {
        phoneNumberId: '',
        businessAccountId: '',
        accessToken: '',
        webhookVerifyToken: ''
      },
      openai: settings.openaiConfig ? JSON.parse(settings.openaiConfig as string) : {
        apiKey: '',
        model: 'gpt-4-turbo-preview',
        maxTokens: 4096
      },
      gemini: settings.geminiConfig ? JSON.parse(settings.geminiConfig as string) : {
        apiKey: '',
        model: 'gemini-pro'
      },
      deepseek: settings.deepseekConfig ? JSON.parse(settings.deepseekConfig as string) : {
        apiKey: '',
        model: 'deepseek-chat',
        baseUrl: 'https://api.deepseek.com'
      }
    };

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar configurações' },
      { status: 500 }
    );
  }
}

// POST - Salvar configurações de uma integração
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, config } = body;

    if (!integrationId || !config) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
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

    // Verificar se já existe configuração para o usuário
    const existingSettings = await prisma.integrationSettings.findFirst({
      where: { userId: session.user.id }
    });

    const updateData = {
      [configField]: JSON.stringify(config),
      updatedAt: new Date()
    };

    if (existingSettings) {
      await prisma.integrationSettings.update({
        where: { id: existingSettings.id },
        data: updateData
      });
    } else {
      await prisma.integrationSettings.create({
        data: {
          userId: session.user.id,
          ...updateData
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Configurações salvas com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configurações' },
      { status: 500 }
    );
  }
}

