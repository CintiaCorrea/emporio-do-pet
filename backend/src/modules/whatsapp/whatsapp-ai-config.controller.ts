import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppConversationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface WhatsAppAIStatus {
  configured: boolean;
  whatsapp: {
    hasAccessToken: boolean;
    hasPhoneNumberId: boolean;
    hasBusinessAccountId: boolean;
    hasWebhookToken: boolean;
  };
  ai: {
    hasOpenAiKey: boolean;
    hasGeminiKey: boolean;
    hasDeepSeekKey: boolean;
  };
  defaultAgent: {
    id: string | null;
    name: string | null;
    isActive: boolean;
  } | null;
  aiServiceUrl: string;
}

@Controller('whatsapp/ai-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppAIConfigController {
  private readonly logger = new Logger(WhatsAppAIConfigController.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  @Get('status')
  @Roles('ADMIN', 'VETERINARIAN', 'RECEPTIONIST')
  async getStatus(): Promise<WhatsAppAIStatus> {
    const defaultAgentId = this.configService.get<string>('whatsapp.defaultAgentId');
    
    let defaultAgent = null;
    if (defaultAgentId) {
      const agent = await this.prisma.aIAgent.findUnique({
        where: { id: defaultAgentId },
        select: { id: true, name: true, status: true },
      });
      
      if (agent) {
        defaultAgent = {
          id: agent.id,
          name: agent.name,
          isActive: agent.status === 'ACTIVE',
        };
      }
    }

    return {
      configured: this.isFullyConfigured(),
      whatsapp: {
        hasAccessToken: !!this.configService.get<string>('whatsapp.accessToken'),
        hasPhoneNumberId: !!this.configService.get<string>('whatsapp.phoneNumberId'),
        hasBusinessAccountId: !!this.configService.get<string>('whatsapp.businessAccountId'),
        hasWebhookToken: !!this.configService.get<string>('whatsapp.webhookVerifyToken'),
      },
      ai: {
        hasOpenAiKey: !!this.configService.get<string>('integrations.openai.apiKey'),
        hasGeminiKey: !!this.configService.get<string>('integrations.gemini.apiKey'),
        hasDeepSeekKey: !!this.configService.get<string>('integrations.deepseek.apiKey'),
      },
      defaultAgent,
      aiServiceUrl: this.configService.get<string>('aiService.url') || 'http://localhost:8000',
    };
  }

  @Get('active-agents')
  @Roles('ADMIN', 'VETERINARIAN', 'RECEPTIONIST')
  async getActiveAgents() {
    const agents = await this.prisma.aIAgent.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        description: true,
        provider: true,
        model: true,
        type: true,
        totalInteractions: true,
        successRate: true,
        avgResponseTime: true,
      },
      orderBy: { name: 'asc' },
    });

    return { agents };
  }

  @Get('conversations-with-ai')
  @Roles('ADMIN', 'VETERINARIAN', 'RECEPTIONIST')
  async getConversationsWithAI() {
    const conversations = await this.prisma.whatsAppConversation.findMany({
      where: {
        assignedAgentId: { not: null },
        isAutoReplyEnabled: true,
      },
      select: {
        id: true,
        contactPhone: true,
        contactName: true,
        status: true,
        lastMessageAt: true,
        assignedAgent: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });

    return { conversations, total: conversations.length };
  }

  @Post('bulk-assign-agent')
  @Roles('ADMIN')
  async bulkAssignAgent(
    @Body() dto: { agentId: string; conversationIds?: string[]; assignToAll?: boolean },
  ) {
    const { agentId, conversationIds, assignToAll } = dto;

    // Verify agent exists and is active
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    if (agent.status !== 'ACTIVE') {
      return { success: false, error: 'Agent is not active' };
    }

    let where: { id?: { in: string[] }; status?: WhatsAppConversationStatus } = {};
    
    if (assignToAll) {
      where = { status: WhatsAppConversationStatus.OPEN };
    } else if (conversationIds && conversationIds.length > 0) {
      where = { id: { in: conversationIds } };
    } else {
      return { success: false, error: 'No conversations specified' };
    }

    const result = await this.prisma.whatsAppConversation.updateMany({
      where,
      data: {
        assignedAgentId: agentId,
        isAutoReplyEnabled: true,
        status: 'ASSIGNED',
      },
    });

    this.logger.log(`Bulk assigned agent ${agent.name} to ${result.count} conversations`);

    return {
      success: true,
      assignedCount: result.count,
      agentName: agent.name,
    };
  }

  @Post('bulk-disable-auto-reply')
  @Roles('ADMIN')
  async bulkDisableAutoReply(
    @Body() dto: { conversationIds?: string[]; disableAll?: boolean },
  ) {
    const { conversationIds, disableAll } = dto;

    let where: { id?: { in: string[] }; isAutoReplyEnabled?: boolean } = {};
    
    if (disableAll) {
      where = { isAutoReplyEnabled: true };
    } else if (conversationIds && conversationIds.length > 0) {
      where = { id: { in: conversationIds } };
    } else {
      return { success: false, error: 'No conversations specified' };
    }

    const result = await this.prisma.whatsAppConversation.updateMany({
      where,
      data: {
        isAutoReplyEnabled: false,
      },
    });

    this.logger.log(`Disabled auto-reply for ${result.count} conversations`);

    return {
      success: true,
      disabledCount: result.count,
    };
  }

  private isFullyConfigured(): boolean {
    const hasWhatsApp = 
      !!this.configService.get<string>('whatsapp.accessToken') &&
      !!this.configService.get<string>('whatsapp.phoneNumberId');

    const hasAiKey = 
      !!this.configService.get<string>('integrations.openai.apiKey') ||
      !!this.configService.get<string>('integrations.gemini.apiKey') ||
      !!this.configService.get<string>('integrations.deepseek.apiKey');

    return hasWhatsApp && hasAiKey;
  }
}
