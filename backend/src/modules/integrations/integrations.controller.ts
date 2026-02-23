import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

interface SaveConfigDto {
  integrationId: string;
  config: Record<string, unknown>;
}

interface DisconnectDto {
  integrationId: string;
}

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(private readonly prisma: PrismaService) {}

  // GET /api/integrations/config — load integration settings
  @Get('config')
  async getConfig(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      return { error: 'Não autorizado' };
    }

    try {
      const settings = await this.prisma.integrationSettings.findFirst({
        where: { userId },
      });

      if (!settings) {
        return {
          config: {
            whatsapp: { phoneNumberId: '', businessAccountId: '', accessToken: '', webhookVerifyToken: '' },
            openai: { apiKey: '', model: 'gpt-4-turbo-preview', maxTokens: 4096 },
            gemini: { apiKey: '', model: 'gemini-pro' },
            deepseek: { apiKey: '', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
          },
        };
      }

      const config = {
        whatsapp: settings.whatsappConfig ? JSON.parse(settings.whatsappConfig) : { phoneNumberId: '', businessAccountId: '', accessToken: '', webhookVerifyToken: '' },
        openai: settings.openaiConfig ? JSON.parse(settings.openaiConfig) : { apiKey: '', model: 'gpt-4-turbo-preview', maxTokens: 4096 },
        gemini: settings.geminiConfig ? JSON.parse(settings.geminiConfig) : { apiKey: '', model: 'gemini-pro' },
        deepseek: settings.deepseekConfig ? JSON.parse(settings.deepseekConfig) : { apiKey: '', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
      };

      return { config };
    } catch (error) {
      this.logger.error('Error loading integration config:', error);
      return { error: 'Erro ao carregar configurações' };
    }
  }

  // POST /api/integrations/config — save integration settings
  @Post('config')
  async saveConfig(@Req() req: any, @Body() body: SaveConfigDto) {
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      return { error: 'Não autorizado' };
    }

    const { integrationId, config } = body;

    if (!integrationId || !config) {
      return { error: 'Dados incompletos' };
    }

    const fieldMap: Record<string, string> = {
      whatsapp: 'whatsappConfig',
      openai: 'openaiConfig',
      gemini: 'geminiConfig',
      deepseek: 'deepseekConfig',
    };

    const configField = fieldMap[integrationId];
    if (!configField) {
      return { error: 'Integração inválida' };
    }

    try {
      const existingSettings = await this.prisma.integrationSettings.findFirst({
        where: { userId },
      });

      const updateData = {
        [configField]: JSON.stringify(config),
        updatedAt: new Date(),
      };

      if (existingSettings) {
        await this.prisma.integrationSettings.update({
          where: { id: existingSettings.id },
          data: updateData,
        });
      } else {
        await this.prisma.integrationSettings.create({
          data: {
            userId,
            ...updateData,
          },
        });
      }

      this.logger.log(`Integration ${integrationId} config saved for user ${userId}`);
      return { success: true, message: 'Configurações salvas com sucesso' };
    } catch (error) {
      this.logger.error('Error saving integration config:', error);
      return { error: 'Erro ao salvar configurações' };
    }
  }

  // POST /api/integrations/disconnect — disconnect an integration
  @Post('disconnect')
  async disconnect(@Req() req: any, @Body() body: DisconnectDto) {
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      return { error: 'Não autorizado' };
    }

    const { integrationId } = body;

    if (!integrationId) {
      return { error: 'ID da integração é obrigatório' };
    }

    const fieldMap: Record<string, string> = {
      whatsapp: 'whatsappConfig',
      openai: 'openaiConfig',
      gemini: 'geminiConfig',
      deepseek: 'deepseekConfig',
    };

    const configField = fieldMap[integrationId];
    if (!configField) {
      return { error: 'Integração inválida' };
    }

    try {
      const existingSettings = await this.prisma.integrationSettings.findFirst({
        where: { userId },
      });

      if (existingSettings) {
        await this.prisma.integrationSettings.update({
          where: { id: existingSettings.id },
          data: {
            [configField]: null,
            updatedAt: new Date(),
          },
        });
      }

      this.logger.log(`Integration ${integrationId} disconnected for user ${userId}`);
      return { success: true, message: 'Integração desconectada com sucesso' };
    } catch (error) {
      this.logger.error('Error disconnecting integration:', error);
      return { error: 'Erro ao desconectar integração' };
    }
  }

  // POST /api/integrations/test — test integration connection
  @Post('test')
  async testConnection(@Req() req: any, @Body() body: { integrationId: string; config: Record<string, unknown> }) {
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      return { success: false, error: 'Não autorizado' };
    }

    const { integrationId, config } = body;

    if (!integrationId || !config) {
      return { success: false, error: 'Dados incompletos' };
    }

    try {
      switch (integrationId) {
        case 'whatsapp': {
          const phoneNumberId = config.phoneNumberId as string;
          const accessToken = config.accessToken as string;
          if (!phoneNumberId || !accessToken) {
            return { success: false, error: 'Phone Number ID e Access Token são obrigatórios' };
          }
          const response = await fetch(
            `https://graph.facebook.com/v21.0/${phoneNumberId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          const data = await response.json();
          if (!response.ok) {
            return { success: false, error: data.error?.message || `HTTP ${response.status}` };
          }
          return { success: true, message: `Conectado ao WhatsApp: ${data.display_phone_number || phoneNumberId}` };
        }

        case 'openai': {
          const apiKey = config.apiKey as string;
          if (!apiKey) {
            return { success: false, error: 'API Key é obrigatória' };
          }
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            const data = await response.json();
            return { success: false, error: data.error?.message || `HTTP ${response.status}` };
          }
          return { success: true, message: 'Conectado à OpenAI com sucesso' };
        }

        case 'gemini': {
          const apiKey = config.apiKey as string;
          if (!apiKey) {
            return { success: false, error: 'API Key é obrigatória' };
          }
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
          );
          if (!response.ok) {
            return { success: false, error: `Erro de autenticação (HTTP ${response.status})` };
          }
          return { success: true, message: 'Conectado ao Google Gemini com sucesso' };
        }

        case 'deepseek': {
          const apiKey = config.apiKey as string;
          const baseUrl = (config.baseUrl as string) || 'https://api.deepseek.com';
          if (!apiKey) {
            return { success: false, error: 'API Key é obrigatória' };
          }
          const response = await fetch(`${baseUrl}/v1/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { success: false, error: `Erro de autenticação (HTTP ${response.status})` };
          }
          return { success: true, message: 'Conectado ao DeepSeek com sucesso' };
        }

        default:
          return { success: false, error: `Integração '${integrationId}' não suportada` };
      }
    } catch (error) {
      this.logger.error(`Error testing integration ${integrationId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao testar conexão' 
      };
    }
  }
}
