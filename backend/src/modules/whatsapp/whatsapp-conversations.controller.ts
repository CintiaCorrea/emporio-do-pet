import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsAppService } from './whatsapp.service';
import {
  SendMessageDto,
  ListConversationsQuery,
  UpdateConversationDto,
  AssignAgentDto,
} from './dto';

interface JwtUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppConversationsController {
  private readonly logger = new Logger(WhatsAppConversationsController.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  // ============================================
  // Conversations
  // ============================================

  @Get('conversations')
  async listConversations(
    @CurrentUser() user: JwtUser,
    @Query() query: ListConversationsQuery,
  ) {
    this.logger.log(`Listing all conversations (shared inbox) for user ${user.id}`);
    
    return this.whatsAppService.getConversations(
      null,
      {
        status: query.status,
        search: query.search,
        hasUnread: query.hasUnread,
        assignedAgentId: query.assignedAgentId,
        tutorId: query.tutorId,
      },
      {
        page: query.page,
        limit: query.limit,
      },
    );
  }

  @Get('conversations/:id')
  async getConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const conversation = await this.whatsAppService.getConversation(id);
    
    if (!conversation) {
      return { error: 'Conversation not found' };
    }
    
    return conversation;
  }

  @Patch('conversations/:id')
  async updateConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.updateConversation(id, dto);
  }

  @Post('conversations/:id/assign-agent')
  async assignAgent(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: AssignAgentDto,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.assignAgentToConversation(id, dto.agentId || null);
  }

  @Post('conversations/:id/assign-user')
  async assignToUser(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.whatsAppService.updateConversation(id, { assignedUserId: body.userId } as any);
  }

    @Post('conversations/:id/takeover')
  async takeoverConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    this.logger.log(`User ${user.id} (${user.name}) taking over conversation ${id}`);
    return this.whatsAppService.takeoverConversation(id, user.id);
  }

  @Post('conversations/:id/release')
  async releaseConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    this.logger.log(`User ${user.id} releasing conversation ${id} back to AI agent`);
    return this.whatsAppService.releaseConversation(id);
  }

  @Post('conversations/:id/close')
  async closeConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.updateConversation(id, { status: 'CLOSED' });
  }

  @Post('conversations/:id/reopen')
  async reopenConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.updateConversation(id, { status: 'OPEN' });
  }

  // ============================================
  // Messages
  // ============================================

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser() user: JwtUser,
    @Param('id') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const conversation = await this.whatsAppService.getConversation(conversationId);
    if (!conversation) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.getMessages(conversationId, {
      page: page || 1,
      limit: limit || 50,
    });
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentUser() user: JwtUser,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    const conversation = await this.whatsAppService.getConversation(conversationId);
    if (!conversation) {
      return { error: 'Conversation not found' };
    }

    this.logger.log(`Sending message to conversation ${conversationId} by user ${user.id}`);

    const result = await this.whatsAppService.sendAndSaveMessage(
      conversation.userId,
      conversationId,
      dto.content,
      dto.type,
      { senderType: 'HUMAN', senderName: user.name || 'Atendente', senderId: user.id },
    );

    return result;
  }

  // ============================================
  // Direct Send (without conversation)
  // ============================================

  @Post('send')
  async sendDirect(
    @CurrentUser() user: JwtUser,
    @Body() dto: { to: string; message: string },
  ) {
    this.logger.log(`Direct send to ${dto.to} from user ${user.id}`);

    // Get or create conversation
    const conversation = await this.whatsAppService.createOrGetConversation(
      user.id,
      dto.to,
    );

    // Send and save
    const result = await this.whatsAppService.sendAndSaveMessage(
      user.id,
      conversation.id,
      dto.message,
      'TEXT',
      { senderType: 'HUMAN', senderName: user.name || 'Atendente', senderId: user.id },
    );

    return {
      conversationId: conversation.id,
      ...result,
    };
  }

  // ============================================
  // Stats
  // ============================================

  @Get('stats')
  async getStats(@CurrentUser() user: JwtUser) {
    const conversations = await this.whatsAppService.getConversations(null, undefined, { limit: 1000 });
    
    const stats = {
      totalConversations: conversations.pagination.total,
      openConversations: 0,
      unreadConversations: 0,
      assignedToAgent: 0,
    };

    for (const conv of conversations.data) {
      if (conv.status === 'OPEN') stats.openConversations++;
      if (conv.unreadCount > 0) stats.unreadConversations++;
      if (conv.assignedAgentId) stats.assignedToAgent++;
    }

    return stats;
  }

  // ============================================
  // Connection Test
  // ============================================

  @Get('test-connection')
  async testConnection(@CurrentUser() user: JwtUser) {
    const config = await this.whatsAppService.getUserWhatsAppConfig(user.id);
    return this.whatsAppService.testConnection(config || undefined);
  }

  @Get('templates')
  async getTemplates(@CurrentUser() user: JwtUser) {
    const config = await this.whatsAppService.getUserWhatsAppConfig(user.id);
    return this.whatsAppService.getTemplates(config || undefined);
  }
}
